import React from 'react';
import emblem from '../assets/ethinx-emblem-v2.png';

const BrandMark = ({ compact = false, className = '' }) => (
  <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''} ${className}`.trim()}>
    <img src={emblem} alt="EthinX emblem" className="brand-mark__emblem" />
    <span className="brand-mark__light-emblem" aria-hidden="true">E</span>
    <div className="brand-mark__copy">
      <span className="brand-mark__eyebrow">EthinX</span>
      <span className="brand-mark__name">Second Brain</span>
    </div>
  </div>
);

export default BrandMark;
