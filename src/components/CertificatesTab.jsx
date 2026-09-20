import React, { useState } from 'react';
import ReportsTab from './ReportsTab';

/**
 * Re-export wrapper for CertificatesTab / Documentation Reports Tab
 */
export default function CertificatesTab(props) {
  const [ewidencjaList, setEwidencjaList] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_ewidencja_zaswiadczen') || localStorage.getItem('crm_ewidencja');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  return (
    <ReportsTab
      {...props}
      ewidencjaList={props.ewidencjaList || ewidencjaList}
      setEwidencjaList={props.setEwidencjaList || setEwidencjaList}
    />
  );
}
