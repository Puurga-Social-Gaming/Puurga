import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * TEST PAGE - Password Reset URL Diagnostic Tool
 * 
 * This page helps you verify exactly what URL is being sent to Supabase
 * for password reset requests.
 * 
 * Access at: http://localhost:5174/test-reset-url
 */
const TestResetUrl: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState('');

    const testPasswordReset = async () => {
        if (!email) {
            toast.error('Please enter an email');
            return;
        }

        setLoading(true);

        // Calculate the redirect URL (same logic as ForgotPassword.tsx)
        const calculatedUrl = `${window.location.origin}/reset-password`;
        setRedirectUrl(calculatedUrl);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: calculatedUrl,
            });

            if (error) {
                toast.error(error.message);
                console.error('Supabase Error:', error);
            } else {
                toast.success('Password reset email sent! Check your inbox.');
                console.log('✅ Success! Redirect URL sent to Supabase:', calculatedUrl);
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="card-gradient p-8 rounded-xl shadow-2xl">
                    <h1 className="text-3xl font-bold text-center text-foreground mb-2">
                        🔧 Password Reset URL Test
                    </h1>
                    <p className="text-center text-muted mb-8">
                        Diagnostic tool to verify the redirect URL
                    </p>

                    {/* Current Environment Info */}
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
                        <h2 className="font-semibold text-foreground mb-3">Current Environment:</h2>
                        <div className="space-y-2 text-sm font-mono">
                            <div>
                                <span className="text-muted">Origin:</span>{' '}
                                <span className="text-green-400">{window.location.origin}</span>
                            </div>
                            <div>
                                <span className="text-muted">Hostname:</span>{' '}
                                <span className="text-green-400">{window.location.hostname}</span>
                            </div>
                            <div>
                                <span className="text-muted">Port:</span>{' '}
                                <span className="text-green-400">{window.location.port}</span>
                            </div>
                            <div>
                                <span className="text-muted">Protocol:</span>{' '}
                                <span className="text-green-400">{window.location.protocol}</span>
                            </div>
                        </div>
                    </div>

                    {/* Calculated Redirect URL */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                        <h2 className="font-semibold text-foreground mb-3">Redirect URL Being Sent:</h2>
                        <div className="text-sm font-mono break-all">
                            {redirectUrl || `${window.location.origin}/reset-password`}
                        </div>
                        <p className="text-xs text-muted mt-2">
                            This is what we're sending to Supabase in the <code>redirectTo</code> parameter
                        </p>
                    </div>

                    {/* Test Form */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="test-email" className="block text-sm font-medium text-foreground mb-2">
                                Email Address (for testing)
                            </label>
                            <input
                                id="test-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full px-4 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted"
                            />
                        </div>

                        <button
                            onClick={testPasswordReset}
                            disabled={loading || !email}
                            className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-theme-button hover:shadow-lg"
                        >
                            {loading ? 'Sending...' : 'Send Test Password Reset'}
                        </button>
                    </div>

                    {/* Important Notes */}
                    <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-500 mb-2">⚠️ IMPORTANT:</h3>
                        <ul className="text-sm text-muted space-y-2 list-disc list-inside">
                            <li>The redirect URL above should be: <code className="text-green-400">http://localhost:5174/reset-password</code></li>
                            <li>If the email link goes to <code className="text-red-400">localhost:3000</code>, your <strong>Supabase dashboard</strong> Site URL is wrong</li>
                            <li>Update Supabase: Authentication → URL Configuration → Site URL = <code>http://localhost:5174</code></li>
                            <li>After updating Supabase, request a NEW reset email (old ones still use old URL)</li>
                        </ul>
                    </div>

                    {/* Console Instructions */}
                    <div className="mt-6 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-400 mb-2">📋 Check Console:</h3>
                        <p className="text-sm text-muted">
                            Open Developer Tools (F12) → Console tab to see detailed logs when you click the button above.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="text-accent hover:underline font-semibold"
                        >
                            ← Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestResetUrl;
