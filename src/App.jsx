import React, { useEffect, useState } from 'react';
import { RotateCcw, Wand2 } from 'lucide-react';
import WizardDungeonCrawler from './WizardDungeonCrawler';

const App = () => {
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div className="w-screen h-screen relative bg-black">
      {/* Rotate overlay for portrait mode */}
      {!isLandscape && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 p-6 text-center">
          <Wand2 className="mb-4 text-purple-200" size={64} />
          <h1 className="text-2xl font-semibold text-white mb-2">
            Rotate Your Device
          </h1>
          <p className="text-purple-100 mb-4 max-w-xs">
            Wizard&apos;s Descent is best experienced in landscape mode.
          </p>
          <RotateCcw size={40} className="text-purple-200 animate-pulse" />
        </div>
      )}

      {/* Game root (your existing styles stay intact) */}
      <div
        className={`w-full h-full ${
          !isLandscape ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } transition-opacity duration-300`}
      >
        <WizardDungeonCrawler />
      </div>
    </div>
  );
};

export default App;
