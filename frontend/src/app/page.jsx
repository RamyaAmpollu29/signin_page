'use client';
import { useState } from 'react';
import { FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import Head from 'next/head';

const SignInPage = () => {
  const [activeCard, setActiveCard] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    otp: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setMessage('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      setMessage(data.message);
      // Redirect or update UI as needed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      setActiveCard('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!otpSent) {
        const res = await fetch('http://localhost:8000/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usePhone ? { phone: formData.phone } : { email: formData.email }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessage(data.message);
        setOtpSent(true);
      } else {
        const res = await fetch('http://localhost:8000/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [usePhone ? 'phone' : 'email']: usePhone ? formData.phone : formData.email,
            otp: formData.otp,
            newPassword: formData.newPassword,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessage(data.message);
        setActiveCard('signin');
        setOtpSent(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Head>
        <title>Authentication</title>
      </Head>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}

        {/* Sign In Card */}
        {activeCard === 'signin' && (
          <div>
            <div className="flex items-center justify-center mb-6">
              <h1 className="text-3xl font-bold">Welcome</h1>
              <FaUser className="ml-2 text-2xl" />
            </div>
            <form onSubmit={handleSignIn}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-9 text-gray-600"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setActiveCard('forgot')}
                  className="text-blue-500 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
            <p className="mt-4 text-center">
              Don't have an account?{' '}
              <button
                onClick={() => setActiveCard('signup')}
                className="text-blue-500 hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}

        {/* Sign Up Card */}
        {activeCard === 'signup' && (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6">Sign Up</h1>
            <p className="text-center mb-4">Create your account</p>
            <form onSubmit={handleSignUp}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-9 text-gray-600"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </form>
            <p className="mt-4 text-center">
              Already have an account?{' '}
              <button
                onClick={() => setActiveCard('signin')}
                className="text-blue-500 hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* Forgot Password Card */}
        {activeCard === 'forgot' && (
          <div>
            <h1 className="text-3xl font-bold text-center mb-6">Forgot Password</h1>
            <form onSubmit={handleForgotPassword}>
              {usePhone ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              )}
              {otpSent && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">OTP</label>
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-9 text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {loading ? 'Processing...' : otpSent ? 'Reset Password' : 'Send OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(!usePhone);
                    setOtpSent(false);
                    setFormData({ ...formData, otp: '', newPassword: '' });
                  }}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  Switch to {usePhone ? 'Email' : 'Phone'}
                </button>
              </div>
              <div className="flex justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCard('signin');
                    setOtpSent(false);
                    setFormData({ ...formData, otp: '', newPassword: '' });
                  }}
                  className="bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignInPage;