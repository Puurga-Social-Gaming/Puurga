import React from 'react';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';

const Security: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Security at Puurga</h1>
          <p className="text-xl text-gray-400">We take your security seriously</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <Lock className="w-8 h-8 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Console Protection</h2>
            <p className="text-gray-400 mb-4">
              We block console access in production to prevent malicious code execution. 
              If someone tells you to paste code in the console, it's a scam.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• Blocks console.log/warn/info in production</li>
              <li>• Prevents common DevTools shortcuts</li>
              <li>• Detects when DevTools are opened</li>
              <li>• Shows security warnings instead</li>
            </ul>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <Eye className="w-8 h-8 text-blue-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Content Security Policy</h2>
            <p className="text-gray-400 mb-4">
              Strict CSP headers prevent XSS attacks and unauthorized resource loading.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• Only allows scripts from trusted sources</li>
              <li>• Blocks external font loading</li>
              <li>• Reports violations to our security team</li>
              <li>• Prevents mixed content attacks</li>
            </ul>
          </div>
        </div>

        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 mb-12">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-3 text-red-400">⚠️ Important Security Notice</h2>
          <div className="text-gray-300 space-y-3">
            <p>
              <strong>NEVER</strong> paste code into your browser console if someone asks you to. 
              This is a common scam that gives attackers access to your account.
            </p>
            <p>
              Puurga staff will <strong>NEVER</strong> ask you to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Paste code in the browser console</li>
              <li>Share your password or authentication tokens</li>
              <li>Download unknown files</li>
              <li>Enable "developer mode" for account features</li>
            </ul>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4">For Developers</h2>
          <div className="text-gray-400 space-y-3">
            <p>
              If you're a legitimate developer working on Puurga:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Set <code className="bg-black/30 px-2 py-1 rounded">NODE_ENV=development</code> to disable console restrictions</li>
              <li>Use browser DevTools Elements panel for inspection</li>
              <li>Check Network tab for API debugging</li>
              <li>Use React DevTools for component state</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-12 text-gray-500">
          <p>© 2026 Puurga - Security First Approach</p>
          <p className="mt-2">Report security issues to: security@puurga.com</p>
        </div>
      </div>
    </div>
  );
};

export default Security;
