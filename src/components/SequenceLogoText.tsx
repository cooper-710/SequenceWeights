import sequenceLogo from 'figma:asset/5c2d0c8af8dfc8338b2c35795df688d7811f7b51.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function SequenceLogoText() {
  return (
    <div className="flex items-center gap-3 sm:gap-6 overflow-visible">
      <div className="flex-shrink-0">
        <ImageWithFallback
          src={sequenceLogo}
          alt="Sequence"
          className="h-12 sm:h-16 w-auto object-contain mix-blend-screen"
          fallback={<img src={sequenceLogo} alt="Sequence" className="h-12 sm:h-16 w-auto object-contain mix-blend-screen" />}
        />
      </div>
      <div className="border-l border-[#F56E0F]/30 pl-6 sm:pl-10 flex-shrink-0">
        <h1 className="text-white text-lg sm:text-2xl tracking-[0.2em] mb-1 whitespace-nowrap">SEQUENCE</h1>
        <p className="text-xs text-[#F56E0F] uppercase tracking-[0.15em] whitespace-nowrap">Performance Training</p>
      </div>
    </div>
  );
}



