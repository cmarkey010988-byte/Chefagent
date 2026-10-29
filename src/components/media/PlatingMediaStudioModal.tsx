import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { ImageResolution, ImageStyle, AspectRatio } from '../../types';
import {
  Image as ImageIcon,
  Sparkles,
  X,
  Download,
  Maximize2,
  Check,
  Layers,
  Palette,
  Camera,
  Share2,
  Clock,
  Zap,
} from 'lucide-react';

export const PlatingMediaStudioModal: React.FC = () => {
  const {
    imageModalOpen,
    setImageModalOpen,
    generatePlatingImage,
    isGeneratingImage,
    generatedImages,
  } = useChef();

  const [prompt, setPrompt] = useState(
    'Prime Tenderloin Au Poivre with glossy cognac reduction, silky potato puree, and micro greens on dark stoneware'
  );
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [style, setStyle] = useState<ImageStyle>('plating');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  if (!imageModalOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGeneratingImage) return;

    const res = await generatePlatingImage({
      prompt: prompt.trim(),
      imageSize: resolution,
      aspectRatio,
      style,
    });

    if (res?.imageUrl) {
      setSelectedPreviewImage(res.imageUrl);
    }
  };

  const samplePrompts = [
    {
      category: 'Plating Blueprint',
      style: 'plating' as ImageStyle,
      prompt:
        'Pan-roasted Pacific Halibut fillet rested in shallot-chive beurre blanc, charred asparagus spears, edible marigolds on bone china plate',
    },
    {
      category: 'Banquet Entree',
      style: 'plating' as ImageStyle,
      prompt:
        'Carved prime rib au poivre with bone-marrow au jus reduction, Yukon gold gratin, and watercress garnish on banquet oval charger',
    },
    {
      category: 'Club Social Promo',
      style: 'marketing' as ImageStyle,
      prompt:
        'Luxury private country club dinner tasting event, wine glasses, gourmet appetizers on marble bar, warm golden hour ambient lighting',
    },
    {
      category: 'Pastry Showcase',
      style: 'plating' as ImageStyle,
      prompt:
        'Warm Belgian dark chocolate lava tart with molten Callebaut ganache, vanilla bean crème anglaise swirl, and edible 24K gold leaf',
    },
  ];

  const currentHeroImage = selectedPreviewImage || generatedImages[0]?.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">
                  Plating Visualizer & Marketing Media Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  gemini-3-pro-image-preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate Michelin-level plating blueprints and promotional social media packages.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setImageModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Output Mode Switcher */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Production Purpose:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStyle('plating')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      style === 'plating'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Plating Blueprint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStyle('marketing')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      style === 'marketing'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Club Social Promo</span>
                  </button>
                </div>
              </div>

              {/* Explicit Image Size Affordance: 1K, 2K, 4K */}
              <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Resolution Sizing:</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    High-Def Detail Rendering
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setResolution(size)}
                      className={`py-2.5 rounded-xl text-center font-mono font-bold transition-all border ${
                        resolution === size
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-base font-black">{size}</div>
                      <div className="text-[9px] uppercase font-sans opacity-80">
                        {size === '1K' && '1024 px'}
                        {size === '2K' && '2048 px'}
                        {size === '4K' && '4096 px'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Aspect Ratio:
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                  {[
                    { ratio: '1:1', label: '1:1 Square' },
                    { ratio: '16:9', label: '16:9 Wide' },
                    { ratio: '4:3', label: '4:3 Standard' },
                    { ratio: '9:16', label: '9:16 Story' },
                  ].map((item) => (
                    <button
                      key={item.ratio}
                      type="button"
                      onClick={() => setAspectRatio(item.ratio as AspectRatio)}
                      className={`py-2 rounded-xl text-center font-bold border transition-all ${
                        aspectRatio === item.ratio
                          ? 'bg-slate-800 text-amber-300 border-amber-500/60 shadow-xs'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {item.ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creative Prompt Input */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Culinary Prompt Description:
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe dish components, plate texture, lighting, and garnish..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Quick Template Buttons */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Preset Culinary Blueprints:
                </label>
                <div className="space-y-1.5">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(p.prompt);
                        setStyle(p.style);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 text-[11px] text-slate-300 hover:text-white transition-colors truncate block"
                    >
                      <strong className="text-amber-400/90 font-mono text-[10px] uppercase mr-1.5">
                        [{p.category}]
                      </strong>
                      <span>{p.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Trigger */}
              <button
                type="submit"
                disabled={isGeneratingImage || !prompt.trim()}
                className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all select-none"
              >
                {isGeneratingImage ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Synthesizing {resolution} Studio Render...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Render with gemini-3-pro-image-preview</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Canvas & Gallery Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Main Stage Display */}
            <div className="relative aspect-square sm:aspect-4/3 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-xl">
              {currentHeroImage ? (
                <>
                  <img
                    src={currentHeroImage}
                    alt="Plating Render"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {/* Floating Action Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/30 font-bold">
                      {resolution} HDR
                    </span>
                    <a
                      href={currentHeroImage}
                      download={`chefagent-render-${Date.now()}.png`}
                      className="p-2 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 transition-colors"
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-400" />
                  <p className="text-xs">No image rendered yet.</p>
                  <p className="text-[11px] text-slate-600">Select resolution (1K, 2K, 4K) and click render.</p>
                </div>
              )}

              {isGeneratingImage && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-amber-400 p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-3">
                    <Sparkles className="w-7 h-7 animate-spin text-amber-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-100 mb-1">
                    Generating High-Resolution {resolution} Visual
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs font-mono">
                    Model: gemini-3-pro-image-preview
                  </p>
                </div>
              )}
            </div>

            {/* Gallery Filmstrip of Past Renders */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                <span>Recent Studio Renders ({generatedImages.length})</span>
                <span className="text-[10px] text-slate-500">Click to preview</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 overflow-x-auto pb-1">
                {generatedImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedPreviewImage(img.imageUrl)}
                    className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                      currentHeroImage === img.imageUrl
                        ? 'border-amber-400 ring-2 ring-amber-400/30 scale-95'
                        : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold bg-black/80 px-1 rounded text-amber-300">
                      {img.resolution}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
