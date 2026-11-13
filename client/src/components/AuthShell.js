import React from 'react';
import { Brain, FileText, Zap } from 'lucide-react';
import BrandMark from './BrandMark';

const valueProps = [
  { label: 'Your knowledge', icon: Brain },
  { label: 'Your documents', icon: FileText },
  { label: 'Your answers', icon: Zap },
];

const AuthShell = ({ title, subtitle, children }) => (
  <main className="auth-shell">
    <div className="auth-orbit auth-orbit--one" aria-hidden="true" />
    <div className="auth-orbit auth-orbit--two" aria-hidden="true" />
    <section className="auth-shell__frame">
      <aside className="auth-shell__brand-panel">
        <BrandMark />
        <div className="auth-shell__value-props" aria-label="Second Brain benefits">
          {valueProps.map(({ label, icon: Icon }) => (
            <div className="auth-shell__value" key={label}>
              <span><Icon className="h-5 w-5" /></span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>
        <p>Enterprise AI workspace</p>
      </aside>
      <div className="auth-shell__content">
        {(title || subtitle) && (
          <header className="auth-shell__header">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}
        {children}
        <p className="auth-shell__footer">Private knowledge. Precise answers. Powered by EthinX.</p>
      </div>
    </section>
  </main>
);

export default AuthShell;
