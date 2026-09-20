import React, { useState } from 'react';
import CertificateModal from './CertificateModal';
import ReportsTab from './ReportsTab';

/**
 * Re-export wrapper for CertificateGenerator / CertificateModal
 */
export default function CertificateGenerator(props) {
  const [ewidencjaList, setEwidencjaList] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_ewidencja_zaswiadczen') || localStorage.getItem('crm_ewidencja');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  if (props.isOpen !== undefined) {
    return (
      <CertificateModal
        {...props}
        ewidencjaList={props.ewidencjaList || ewidencjaList}
      />
    );
  }

  return (
    <ReportsTab
      {...props}
      ewidencjaList={props.ewidencjaList || ewidencjaList}
      setEwidencjaList={props.setEwidencjaList || setEwidencjaList}
    />
  );
}
