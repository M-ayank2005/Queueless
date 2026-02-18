"use client";
import React from 'react';
import QRScanner from '@/components/QRScanner';
import { motion } from 'framer-motion';

export default function ScanPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <QRScanner />
            </motion.div>
        </div>
    );
}
