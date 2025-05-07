'use client';

import { useEffect } from 'react';
import { initializeFrame } from '@/lib/frame'; // Corrected import path if lib is at the root

export function FrameInit() {
  useEffect(() => {
    console.log("Initializing Frame...");
    initializeFrame().catch(error => {
        console.error("Failed to initialize frame:", error);
    });
  }, []);

  return null;
} 