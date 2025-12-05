import { motion } from 'framer-motion';
import sequenceLogo from 'figma:asset/5c2d0c8af8dfc8338b2c35795df688d7811f7b51.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.1, 1],
            opacity: 1,
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 1.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse" as const,
            repeatDelay: 0.5
          }}
          className="relative"
        >
          <ImageWithFallback
            src={sequenceLogo}
            alt="Sequence"
            className="h-20 w-20 object-contain mix-blend-screen"
            fallback={<img src={sequenceLogo} alt="Sequence" className="h-20 w-20 object-contain mix-blend-screen" />}
          />
          {/* Pulsing glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-[#F56E0F]/20 blur-xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-3"
        >
          <h2 className="text-white text-xl tracking-[0.2em]">SEQUENCE</h2>
          <div className="flex items-center gap-2">
            <motion.div
              className="h-2 w-2 rounded-full bg-[#F56E0F]"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-[#F56E0F]"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.2
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-[#F56E0F]"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.4
              }}
            />
          </div>
        </motion.div>

        {/* Animated Progress Bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="h-1 bg-zinc-800 rounded-full overflow-hidden"
          style={{ width: 200 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#F56E0F] to-orange-500"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ width: '50%' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

