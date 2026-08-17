'use client';

import React, { useEffect, useState } from 'react';
import { useGuest } from '@/lib/guest-context';
import {
  requestOtp,
  verifyOtp,
  registerGuest,
  logoutGuest,
  getLoyalty,
  updateProfile,
} from '@/lib/api-client';
import type { GuestLoyaltyResponse } from '@corgi/contracts';

export default function LoyaltyPage() {
  const { isLoggedIn, profileName, refreshAuth } = useGuest();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [needRegister, setNeedRegister] = useState(false);

  // Registration form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');

  const [loyalty, setLoyalty] = useState<GuestLoyaltyResponse | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      getLoyalty().then(setLoyalty).catch(console.error);
    } else {
      setLoyalty(null);
    }
  }, [isLoggedIn]);

  const handleRequestOtp = async () => {
    try {
      const res = await requestOtp(phone);
      setOtpSent(true);
      if (res.devCode) {
        setDevCode(res.devCode);
      }
    } catch (err: any) {
      alert(`OTP request failed: ${err.message}`);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await verifyOtp(phone, otpCode);
      if (res.ok) {
        await refreshAuth();
        setOtpSent(false);
      } else {
        setNeedRegister(true);
      }
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('register')) {
        setNeedRegister(true);
      } else {
        alert(`OTP verification failed: ${err.message}`);
      }
    }
  };

  const handleRegister = async () => {
    try {
      await registerGuest({
        phone,
        code: otpCode,
        name: regName,
        email: regEmail,
        allergyNotes: allergyNotes || undefined,
      });
      await refreshAuth();
      setNeedRegister(false);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await logoutGuest();
    await refreshAuth();
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ allergyNotes });
      alert('Profile updated!');
    } catch (err: any) {
      alert(`Failed to update profile: ${err.message}`);
    }
  };

  if (isLoggedIn) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Welcome, {profileName}!</h1>
        {loyalty && (
          <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
            <h2>Loyalty Status</h2>
            <p>Tier: {loyalty.customer.tier}</p>
            <p>Points: {loyalty.customer.points.toFixed(2)}</p>
            <h3>Your Member QR:</h3>
            <div style={{ padding: '10px', background: '#eee', display: 'inline-block' }}>
              <code>[QR: {loyalty.qrCode}]</code>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <h3>Update Allergy Notes</h3>
          <input
            type="text"
            placeholder="e.g. Nuts, Dairy"
            value={allergyNotes}
            onChange={(e) => setAllergyNotes(e.target.value)}
          />
          <button onClick={handleUpdateProfile} style={{ marginLeft: '10px' }}>Save</button>
        </div>

        <button onClick={handleLogout} style={{ marginTop: '30px', display: 'block' }}>Logout</button>
      </div>
    );
  }

  if (needRegister) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Complete Profile</h1>
        <label style={{ display: 'block', margin: '10px 0' }}>
          Name:
          <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required />
        </label>
        <label style={{ display: 'block', margin: '10px 0' }}>
          Email:
          <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
        </label>
        <label style={{ display: 'block', margin: '10px 0' }}>
          Allergy Notes:
          <input type="text" value={allergyNotes} onChange={(e) => setAllergyNotes(e.target.value)} />
        </label>
        <button onClick={handleRegister}>Create Account</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Loyalty Program</h1>
      <p>Log in or sign up using your phone number to earn points and redeem awards.</p>

      {!otpSent ? (
        <div>
          <input
            type="tel"
            placeholder="+34600111222"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleRequestOtp} style={{ marginLeft: '10px' }}>Send SMS OTP</button>
        </div>
      ) : (
        <div>
          <p>Enter the verification code sent to {phone}</p>
          {devCode && <p style={{ color: 'green' }}>Dev Code (Auto-resolved): {devCode}</p>}
          <input
            type="text"
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
          <button onClick={handleVerifyOtp} style={{ marginLeft: '10px' }}>Verify Code</button>
        </div>
      )}
    </div>
  );
}
