import React from 'react';
import BrandMark from './BrandMark';

const AuthShell = ({ title, subtitle, children }) => (
  <main className="auth-shell">
    <div className="auth-orbit auth-orbit--one" aria-hidden="true" />
    <div className="auth-orbit auth-orbit--two" aria-hidden="true" />
    <section className="auth-shell__content">
      <BrandMark />
      {(title || subtitle) && (
        <header className="auth-shell__header">
          {title && <h1>{title}</h1>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      {children}
      <p className="auth-shell__footer">Private knowledge. Precise answers. Powered by EthinX.</p>
    </section>
  </main>
);

export default AuthShell;
