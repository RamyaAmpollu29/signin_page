from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Integer, String, DateTime, select
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    sessionmaker,
)
import bcrypt
import jwt
import datetime
import random
import string
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/postgres')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True
)
class Base(DeclarativeBase):
    pass



# JWT secret
JWT_SECRET = os.getenv('JWT_SECRET')

# SQLAlchemy Models
class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    full_name: Mapped[str] = mapped_column(String, nullable=False)

    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    phone: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    password: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        default=datetime.datetime.utcnow
    )

class OTP(Base):
    __tablename__ = "otps"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    email: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    otp: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    expiry: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        nullable=False
    )

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models for request validation
class SignInData(BaseModel):
    email: str
    password: str

class SignUpData(BaseModel):
    fullName: str
    email: str
    phone: str
    password: str

class ForgotPasswordData(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class ResetPasswordData(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    otp: str
    newPassword: str

def generate_otp(length: int = 6) -> str:
    """Generate a random OTP of specified length."""
    return ''.join(random.choices(string.digits, k=length))

@app.post("/api/signin")
async def signin(data: SignInData):
    db = SessionLocal()
    try:
        if not data.email or not data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        stmt = select(User).where(User.email == data.email)

        user = db.execute(stmt).scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not bcrypt.checkpw(data.password.encode('utf-8'), user.password.encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Generate JWT token
        token = jwt.encode(
            payload={
                "user_id": user.id,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            key=JWT_SECRET,
            algorithm="HS256"
        )

        return {"message": "Sign-in successful", "token": token}
    except Exception as e:
        print("Error during signin:", str(e))
        raise
    finally:
        db.close()

@app.post("/api/signup")
async def signup(data: SignUpData):
    db = SessionLocal()
    try:
        if not all([data.fullName, data.email, data.phone, data.password]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All fields are required"
            )

        if db.execute(select(User).where(User.email == data.email)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )

        if db.execute(select(User).where(User.phone == data.phone)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already exists"
            )

        # Hash password
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Insert user
        new_user = User(
            full_name=data.fullName,
            email=data.email,
            phone=data.phone,
            password=hashed_password
        )
        db.add(new_user)
        db.commit()

        return {"message": "Sign-up successful"}
    finally:
        db.close()

@app.post("/api/forgot-password")
async def forgot_password(data: ForgotPasswordData):
    db = SessionLocal()
    try:
        if not (data.email or data.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone is required"
            )

        query = User.email == data.email if data.email else User.phone == data.phone
        stmt = select(User).where(query)

        user = db.execute(stmt).scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Generate OTP
        otp = generate_otp()
        otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

        # Store OTP
        old_otp = db.execute(
            select(OTP).where(
                OTP.email == data.email
                if data.email
                else OTP.phone == data.phone
            )
        ).scalar_one_or_none()

        if old_otp:
            db.delete(old_otp)
        new_otp = OTP(
            email=data.email,
            phone=data.phone,
            otp=otp,
            expiry=otp_expiry
        )
        db.add(new_otp)
        db.commit()

        # In a production environment, send OTP via email or SMS
        # For now, we'll just print it (not secure, for demo only)
        print(f"OTP for {data.email or data.phone}: {otp}")  # Log OTP for testing
        return {"message": "OTP sent successfully"}
    finally:
        db.close()

@app.post("/api/reset-password")
async def reset_password(data: ResetPasswordData):
    db = SessionLocal()
    try:
        if not (data.otp and data.newPassword and (data.email or data.phone)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP, new password, and email/phone are required"
            )

        stmt = select(OTP).where(
            OTP.otp == data.otp,
            OTP.email == data.email
            if data.email
            else OTP.phone == data.phone,
        )

        otp_record = db.execute(stmt).scalar_one_or_none()
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        if otp_record.expiry < datetime.datetime.utcnow():
            db.delete(otp_record)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired"
            )

        # Update password
        hashed_password = bcrypt.hashpw(data.newPassword.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        stmt = select(User).where(
            User.email == data.email
            if data.email
            else User.phone == data.phone
        )

        user = db.execute(stmt).scalar_one_or_none()
        user.password = hashed_password
        db.delete(otp_record)
        db.commit()

        return {"message": "Password reset successful"}
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)