import React from "react";
import { motion } from "motion/react";

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center space-y-4"
      >
        {/* Spinner */}
        <div className="w-14 h-14 border-4 border-t-transparent border-white rounded-full animate-spin" />

        {/* Text */}
        <p className="text-white text-lg font-medium text-center px-4">
          {message || "Processing your request..."}
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingOverlay;
