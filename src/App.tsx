/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Play, Pause, RotateCcw, SkipForward, BookOpen, 
  BarChart2, CheckCircle2, AlertCircle, Sliders, Zap, Cpu, 
  Layers, Info, HelpCircle, Trash2, FileText, Sparkles, 
  ArrowRight, ShieldCheck, Clock, Award, Terminal, Rocket, Activity, AlertTriangle, Sun, Moon
} from 'lucide-react';

// --- KMP Algorithm Core Implementation ---

export function buildLPS(pattern: string): number[] {
  const m = pattern.length;
  const lps = new Array(m).fill(0);
  let len = 0;
  let i = 1;
  while (i < m) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

export interface KMPStep {
  i: number; // text index
  j: number; // pattern index
  textChar: string;
  patternChar: string;
  matched: boolean;
  mismatch: boolean;
  foundMatch: number | null;
  action: 'compare' | 'match' | 'mismatch' | 'lps_jump' | 'complete';
  explanation: string;
  comparisons: number;
}

export interface SearchResult {
  matches: number[];
  comparisons: number;
  steps: KMPStep[];
  lps: number[];
  timeMs: number;
}

export function simulateKMPSearch(text: string, pattern: string, caseSensitive: boolean = true): SearchResult {
  const startTime = performance.now();
  const t = caseSensitive ? text : text.toLowerCase();
  const p = caseSensitive ? pattern : pattern.toLowerCase();
  const n = t.length;
  const m = p.length;
  
  const matches: number[] = [];
  const steps: KMPStep[] = [];
  let comparisons = 0;

  if (m === 0 || n === 0 || m > n) {
    const endTime = performance.now();
    return { matches, comparisons, steps, lps: [], timeMs: endTime - startTime };
  }

  const lps = buildLPS(p);
  let i = 0; // index for text
  let j = 0; // index for pattern

  while (i < n) {
    comparisons++;
    const isMatch = t[i] === p[j];
    
    if (isMatch) {
      if (n < 50000) {
        steps.push({
          i,
          j,
          textChar: text[i],
          patternChar: pattern[j],
          matched: true,
          mismatch: false,
          foundMatch: null,
          action: 'match',
          explanation: `Comparing text[${i}] ('${text[i]}') with pattern[${j}] ('${pattern[j]}') → Match`,
          comparisons
        });
      }
      i++;
      j++;

      if (j === m) {
        const startIdx = i - j;
        matches.push(startIdx);
        if (n < 50000) {
          steps.push({
            i: i - 1,
            j: j - 1,
            textChar: text[i - 1],
            patternChar: pattern[j - 1],
            matched: true,
            mismatch: false,
            foundMatch: startIdx,
            action: 'complete',
            explanation: `Pattern found at index ${startIdx}. Using LPS[${m - 1}] = ${lps[m - 1]} to continue search.`,
            comparisons
          });
        }
        j = lps[j - 1];
      }
    } else {
      if (n < 50000) {
        steps.push({
          i,
          j,
          textChar: text[i],
          patternChar: pattern[j],
          matched: false,
          mismatch: true,
          foundMatch: null,
          action: 'mismatch',
          explanation: `Comparing text[${i}] ('${text[i]}') with pattern[${j}] ('${pattern[j]}') → Mismatch. ${j > 0 ? `Using LPS[${j - 1}] = ${lps[j - 1]} to shift pattern.` : 'Advancing text pointer i.'}`,
          comparisons
        });
      }

      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }

  const endTime = performance.now();
  return { matches, comparisons, steps, lps, timeMs: Math.max(endTime - startTime, 0.1) };
}

export function runBruteForceSearch(text: string, pattern: string, caseSensitive: boolean = true) {
  const startTime = performance.now();
  const t = caseSensitive ? text : text.toLowerCase();
  const p = caseSensitive ? pattern : pattern.toLowerCase();
  const n = t.length;
  const m = p.length;
  const matches: number[] = [];
  let comparisons = 0;

  if (m === 0 || n === 0 || m > n) {
    const endTime = performance.now();
    return { matches, comparisons, timeMs: endTime - startTime };
  }

  for (let i = 0; i <= n - m; i++) {
    let j = 0;
    while (j < m) {
      comparisons++;
      if (t[i + j] === p[j]) {
        j++;
      } else {
        break;
      }
    }
    if (j === m) {
      matches.push(i);
    }
  }
  const endTime = performance.now();
  return { matches, comparisons, timeMs: Math.max(endTime - startTime, 0.1) };
}

// Sample Datasets
const SAMPLE_DATASETS = {
  default: {
    name: "Standard Sample",
    text: "Algorithms are fundamental to computer science. Efficient algorithms help process large amounts of data quickly. String searching algorithms are used in search engines, text editors, DNA analysis, and many other applications...",
    pattern: "algorithm"
  },
  dna: {
    name: "DNA Sequence",
    text: "ACCGGTTGAAAGGCCTTAACCGGTTGAAAGGCCTTACCGGTTGAAAGGCCTTATCGGATCGATCGATCG",
    pattern: "ACCGGTT"
  },
  repeated: {
    name: "Repeated Characters",
    text: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    pattern: "AAAAA"
  },
  classic: {
    name: "Classic KMP Test",
    text: "ABABDABACDABABCABABABABCABAB",
    pattern: "ABABCABAB"
  }
};

function generateStressDataset(size: number) {
  const dictionary = ["algorithm", "data", "structure", "search", "pattern", "matching", "string", "optimal", "efficiency", "complexity", "compute", "analysis"];
  let text = "";
  const pattern = "algorithm";
  
  while (text.length < size) {
    const word = dictionary[Math.floor(Math.abs(Math.sin(text.length + 1)) * dictionary.length)];
    text += word + " ";
    if (text.length % 150 === 0) {
      text += "algorithm ";
    }
  }
  text = text.substring(0, size);
  return { text, pattern };
}

export interface BenchmarkRecord {
  id: string;
  size: number;
  pattern: string;
  kmpComp: number;
  bfComp: number;
  kmpTime: number;
  bfTime: number;
  efficiency: number;
  timestamp: string;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [text, setText] = useState(SAMPLE_DATASETS.default.text);
  const [pattern, setPattern] = useState(SAMPLE_DATASETS.default.pattern);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(true);
  const [educationalMode, setEducationalMode] = useState<boolean>(true);
  
  const [searchResult, setSearchResult] = useState<SearchResult>(() => simulateKMPSearch(SAMPLE_DATASETS.default.text, SAMPLE_DATASETS.default.pattern, true));
  const [bruteForceResult, setBruteForceResult] = useState(() => runBruteForceSearch(SAMPLE_DATASETS.default.text, SAMPLE_DATASETS.default.pattern, true));

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(400);

  const handleSearch = () => {
    const res = simulateKMPSearch(text, pattern, caseSensitive);
    const bf = runBruteForceSearch(text, pattern, caseSensitive);
    setSearchResult(res);
    setBruteForceResult(bf);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    handleSearch();
  }, [text, pattern, caseSensitive]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      if (currentStepIndex >= searchResult.steps.length - 1) {
        setIsPlaying(false);
        return;
      }
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex(prev => Math.min(prev + 1, searchResult.steps.length - 1));
      }, speedMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, searchResult.steps.length, speedMs]);

  const handleClear = () => {
    setText('');
    setPattern('');
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleLoadSample = (key: keyof typeof SAMPLE_DATASETS) => {
    const ds = SAMPLE_DATASETS[key];
    setText(ds.text);
    setPattern(ds.pattern);
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const activeStep = searchResult.steps[currentStepIndex] || null;

  const renderedMatchedText = useMemo(() => {
    if (!pattern || searchResult.matches.length === 0 || text.length === 0) {
      return <span>{text}</span>;
    }

    const matches = searchResult.matches;
    const m = pattern.length;
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    matches.forEach((start, idx) => {
      if (start > lastIdx) {
        elements.push(<span key={`text-${idx}`}>{text.substring(lastIdx, start)}</span>);
      }
      const matchedSub = text.substring(start, start + m);
      elements.push(
        <mark 
          key={`match-${idx}`} 
          className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 font-medium px-1 rounded border border-indigo-300 dark:border-indigo-500/30"
          title={`Match found at index ${start}`}
        >
          {matchedSub}
        </mark>
      );
      lastIdx = start + m;
    });

    if (lastIdx < text.length) {
      elements.push(<span key={`text-end`}>{text.substring(lastIdx)}</span>);
    }

    return <>{elements}</>;
  }, [text, pattern, searchResult.matches]);

  const [benchmarkData, setBenchmarkData] = useState<Array<{ name: string; textSize: number; patternSize: number; kmpComp: number; bfComp: number }>>([
    { name: "Small Dataset", textSize: 150, patternSize: 5, kmpComp: 182, bfComp: 450 },
    { name: "Medium Dataset", textSize: 1200, patternSize: 8, kmpComp: 1420, bfComp: 3890 },
    { name: "Large Dataset", textSize: 10000, patternSize: 12, kmpComp: 11200, bfComp: 34500 },
  ]);

  const runBenchmarkSuite = () => {
    const smallText = "Algorithms are essential for data processing. Good algorithms save time and compute resources.";
    const smallPat = "rithm";
    const medText = "A".repeat(500) + "B" + "A".repeat(500);
    const medPat = "AAAAAB";
    const largeText = "ABC".repeat(3000) + "XYZ";
    const largePat = "ABCABC";

    const s1 = simulateKMPSearch(smallText, smallPat, true);
    const b1 = runBruteForceSearch(smallText, smallPat, true);
    const s2 = simulateKMPSearch(medText, medPat, true);
    const b2 = runBruteForceSearch(medText, medPat, true);
    const s3 = simulateKMPSearch(largeText, largePat, true);
    const b3 = runBruteForceSearch(largeText, largePat, true);

    setBenchmarkData([
      { name: "Small Dataset", textSize: smallText.length, patternSize: smallPat.length, kmpComp: s1.comparisons, bfComp: b1.comparisons },
      { name: "Medium Dataset", textSize: medText.length, patternSize: medPat.length, kmpComp: s2.comparisons, bfComp: b2.comparisons },
      { name: "Large Dataset", textSize: largeText.length, patternSize: largePat.length, kmpComp: s3.comparisons, bfComp: b3.comparisons },
    ]);
  };

  const comparisonReduction = bruteForceResult.comparisons > 0 
    ? Math.max(0, Math.round(((bruteForceResult.comparisons - searchResult.comparisons) / bruteForceResult.comparisons) * 100))
    : 0;

  // Stress Test State
  const [stressSize, setStressSize] = useState<number>(10000);
  const [customStressInput, setCustomStressInput] = useState<string>("100000");
  const [stressRunning, setStressRunning] = useState<boolean>(false);
  const [stressProgress, setStressProgress] = useState<string>("");
  const [stressResult, setStressResult] = useState<{
    text: string;
    pattern: string;
    kmp: SearchResult | null;
    bf: { matches: number[]; comparisons: number; timeMs: number } | null;
    validated: boolean;
  }>({ text: "", pattern: "", kmp: null, bf: null, validated: false });

  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRecord[]>([
    {
      id: "hist-1",
      size: 10000,
      pattern: "algorithm",
      kmpComp: 11200,
      bfComp: 34500,
      kmpTime: 1.2,
      bfTime: 8.5,
      efficiency: 67.5,
      timestamp: "10:45"
    }
  ]);

  const [vivaExplanationModal, setVivaExplanationModal] = useState<boolean>(false);

  const runStressTest = (targetSize: number) => {
    if (stressRunning) return;
    setStressRunning(true);
    setStressProgress("Generating dataset...");

    setTimeout(() => {
      const { text: genText, pattern: genPat } = generateStressDataset(targetSize);
      setStressProgress("Running KMP algorithm...");

      setTimeout(() => {
        const kmpRes = simulateKMPSearch(genText, genPat, true);
        setStressProgress("Running Brute Force algorithm...");

        setTimeout(() => {
          const bfRes = runBruteForceSearch(genText, genPat, true);
          setStressProgress("Analyzing and validating results...");

          setTimeout(() => {
            const matchesMatch = kmpRes.matches.length === bfRes.matches.length &&
              kmpRes.matches.every((val, idx) => val === bfRes.matches[idx]);

            const efficiency = bfRes.comparisons > 0 
              ? Number((((bfRes.comparisons - kmpRes.comparisons) / bfRes.comparisons) * 100).toFixed(1))
              : 0;

            setStressResult({
              text: genText,
              pattern: genPat,
              kmp: kmpRes,
              bf: bfRes,
              validated: matchesMatch
            });

            const newRecord: BenchmarkRecord = {
              id: `hist-${Date.now()}`,
              size: targetSize,
              pattern: genPat,
              kmpComp: kmpRes.comparisons,
              bfComp: bfRes.comparisons,
              kmpTime: Number(kmpRes.timeMs.toFixed(2)),
              bfTime: Number(bfRes.timeMs.toFixed(2)),
              efficiency,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setBenchmarkHistory(prev => [newRecord, ...prev]);
            setStressRunning(false);
            setStressProgress("Complete");
          }, 200);
        }, 200);
      }, 200);
    }, 200);
  };

  const handleResetStressTest = () => {
    setStressResult({ text: "", pattern: "", kmp: null, bf: null, validated: false });
    setStressProgress("");
  };

  // Theme styles
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-sm transition-colors duration-200 ${
        isLight ? 'border-slate-200 bg-white/80' : 'border-slate-800 bg-slate-950/80'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              KMP Text Search Visualizer
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>
              DAA Project
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
              <a href="#search" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Search</a>
              <a href="#lps" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">LPS Array</a>
              <a href="#visualizer" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Visualizer</a>
              <a href="#stress" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Stress Test</a>
              <a href="#comparison" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Comparison</a>
              <a href="#viva" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Viva</a>
            </nav>
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`p-2 rounded-lg border transition-colors ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-10 space-y-12 flex-grow">
        
        {/* Search Section */}
        <section id="search" className="space-y-6">
          <div className="space-y-1">
            <h2 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Algorithm Input</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure text and search pattern for Knuth-Morris-Pratt execution.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Text</span>
                <span className="font-mono">{text.length} chars</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text..."
                rows={5}
                className={`w-full border rounded-lg p-3 text-xs font-mono resize-y focus:outline-none transition-colors ${
                  isLight 
                    ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400' 
                    : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-slate-600'
                }`}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Pattern</span>
                  <span className="font-mono">{pattern.length} chars</span>
                </div>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Enter pattern..."
                  className={`w-full border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-slate-600'
                  }`}
                />
              </div>

              <div className={`border rounded-lg p-3 space-y-2 text-xs transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Case Sensitive</span>
                  <button
                    onClick={() => setCaseSensitive(!caseSensitive)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${caseSensitive ? 'bg-indigo-600' : isLight ? 'bg-slate-200' : 'bg-slate-800'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${caseSensitive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Educational Mode</span>
                  <button
                    onClick={() => setEducationalMode(!educationalMode)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${educationalMode ? 'bg-indigo-600' : isLight ? 'bg-slate-200' : 'bg-slate-800'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${educationalMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSearch}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
                <button
                  onClick={handleClear}
                  className={`border py-2.5 px-3 rounded-lg text-xs transition-colors ${
                    isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(SAMPLE_DATASETS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => handleLoadSample(k as any)}
                    className={`px-2 py-1 border rounded text-[11px] transition-colors ${
                      isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results Metrics Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`border rounded-lg p-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Matches</span>
            <span className={`text-xl font-mono font-semibold mt-1 block ${isLight ? 'text-slate-900' : 'text-white'}`}>{searchResult.matches.length}</span>
          </div>
          <div className={`border rounded-lg p-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Text Length</span>
            <span className={`text-xl font-mono font-semibold mt-1 block ${isLight ? 'text-slate-900' : 'text-white'}`}>{text.length}</span>
          </div>
          <div className={`border rounded-lg p-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Pattern Length</span>
            <span className={`text-xl font-mono font-semibold mt-1 block ${isLight ? 'text-slate-900' : 'text-white'}`}>{pattern.length}</span>
          </div>
          <div className={`border rounded-lg p-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">KMP Comparisons</span>
            <span className="text-xl font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-1 block">{searchResult.comparisons}</span>
          </div>
        </section>

        {/* Matched Text Section */}
        <section className={`border rounded-lg p-5 space-y-3 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Highlighted Text Matches</span>
            <span className="font-mono">Positions: {searchResult.matches.length > 0 ? searchResult.matches.join(', ') : 'None'}</span>
          </div>
          <div className={`border rounded p-4 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap break-all transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            {text.length > 0 ? renderedMatchedText : <span className="text-slate-400">No text input</span>}
          </div>
        </section>

        {/* LPS Array Section */}
        <section id="lps" className={`border rounded-lg p-5 space-y-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="space-y-1">
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>LPS Array (Longest Proper Prefix which is also a Suffix)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Precomputed jump table used during pattern mismatches.</p>
          </div>

          {pattern.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <div className={`inline-flex gap-1.5 p-2 border rounded-lg transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                {pattern.split('').map((char, idx) => (
                  <div key={idx} className={`flex flex-col items-center min-w-[42px] border rounded p-1.5 text-center font-mono transition-colors ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <span className="text-[9px] text-slate-400">{idx}</span>
                    <span className={`text-sm font-bold my-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{char}</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{searchResult.lps[idx]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Enter a pattern to view LPS.</p>
          )}
        </section>

        {/* KMP Search Visualizer */}
        <section id="visualizer" className={`border rounded-lg p-5 space-y-5 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Step-by-Step Search Visualizer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Examine how KMP moves pointers and applies LPS jumps.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                className={`p-2 border rounded-lg text-xs transition-colors ${
                  isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className={`p-2 border rounded-lg text-xs font-mono disabled:opacity-40 transition-colors ${
                  isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                ◀
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => setCurrentStepIndex(prev => Math.min(searchResult.steps.length - 1, prev + 1))}
                disabled={currentStepIndex >= searchResult.steps.length - 1}
                className={`p-2 border rounded-lg text-xs font-mono disabled:opacity-40 transition-colors ${
                  isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                ▶
              </button>
            </div>
          </div>

          {searchResult.steps.length > 0 ? (
            <div className="space-y-4">
              <div className={`border rounded-lg p-3 flex items-center justify-between text-xs font-mono transition-colors ${
                isLight ? 'bg-slate-50 border-slate-200 text-indigo-700' : 'bg-slate-950 border-slate-800 text-indigo-300'
              }`}>
                <span>
                  Step {currentStepIndex + 1} / {searchResult.steps.length}: {activeStep?.explanation}
                </span>
                <span className="text-slate-500 dark:text-slate-400">Comps: {activeStep?.comparisons}</span>
              </div>

              <div className={`border rounded-lg p-4 overflow-x-auto space-y-4 font-mono text-xs transition-colors ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Text</span>
                  <div className="flex gap-1 min-w-max">
                    {text.split('').map((char, idx) => (
                      <div 
                        key={`t-${idx}`}
                        className={`w-8 h-10 flex flex-col items-center justify-center rounded border transition-colors ${
                          activeStep && activeStep.i === idx
                            ? activeStep.mismatch 
                              ? 'bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-500/20 dark:border-rose-500 dark:text-rose-300' 
                              : 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500 dark:text-emerald-300'
                            : isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400">{idx}</span>
                        <span>{char === ' ' ? '·' : char}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <span className="text-[11px] text-slate-400 block mb-1">Pattern (Shift: {activeStep ? activeStep.i - activeStep.j : 0})</span>
                  <div className="flex gap-1 min-w-max">
                    {activeStep && (() => {
                      const shift = activeStep.i - activeStep.j;
                      const padding = [];
                      for (let p = 0; p < Math.max(0, shift); p++) {
                        padding.push(<div key={`pad-${p}`} className="w-8 h-10 border border-transparent"></div>);
                      }
                      const patEls = pattern.split('').map((char, pIdx) => (
                        <div 
                          key={`p-${pIdx}`}
                          className={`w-8 h-10 flex flex-col items-center justify-center rounded border transition-colors ${
                            activeStep.j === pIdx
                              ? activeStep.mismatch 
                                ? 'bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-500/20 dark:border-rose-500 dark:text-rose-300' 
                                : 'bg-indigo-100 border-indigo-400 text-indigo-800 dark:bg-indigo-500/20 dark:border-indigo-500 dark:text-indigo-300'
                              : isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="text-[9px] text-slate-400">{pIdx}</span>
                          <span>{char === ' ' ? '·' : char}</span>
                        </div>
                      ));
                      return [...padding, ...patEls];
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No visualizer steps.</p>
          )}
        </section>

        {/* 🚀 Large Dataset Stress Test & Performance Analyzer */}
        <section id="stress" className={`border rounded-lg p-6 space-y-6 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Large Dataset Stress Test
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Benchmark KMP vs Brute Force across massive datasets.</p>
            </div>
            <button
              onClick={() => setVivaExplanationModal(true)}
              className={`px-3 py-1.5 border rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Explain Results
            </button>
          </div>

          <div className={`border rounded-lg p-5 space-y-4 transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">Scale:</span>
              {[
                { label: "1K", val: 1000 },
                { label: "10K", val: 10000 },
                { label: "100K", val: 100000 },
                { label: "500K", val: 500000 },
                { label: "1M", val: 1000000 }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => { setStressSize(item.val); setCustomStressInput(String(item.val)); }}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                    stressSize === item.val
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 dark:text-slate-400">Custom:</span>
                <input
                  type="number"
                  value={customStressInput}
                  onChange={(e) => {
                    setCustomStressInput(e.target.value);
                    const parsed = Number(e.target.value);
                    if (!isNaN(parsed) && parsed > 0) setStressSize(parsed);
                  }}
                  className={`border rounded px-2.5 py-1.5 text-xs font-mono w-36 focus:outline-none transition-colors ${
                    isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200 focus:border-slate-600'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
                <button
                  onClick={() => runStressTest(stressSize)}
                  disabled={stressRunning}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {stressRunning ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {stressRunning ? "Running..." : "Run Stress Test"}
                </button>
                <button
                  onClick={handleResetStressTest}
                  disabled={stressRunning}
                  className={`px-3 py-2 border rounded text-xs transition-colors ${
                    isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  Reset
                </button>
              </div>
            </div>

            {stressRunning && (
              <div className={`border rounded p-3 text-xs font-mono flex items-center gap-2 transition-colors ${
                isLight ? 'bg-white border-slate-200 text-indigo-600' : 'bg-slate-900 border-slate-800 text-indigo-300'
              }`}>
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>{stressProgress}</span>
              </div>
            )}
          </div>

          {stressResult.kmp && stressResult.bf && (
            <div className="space-y-4">
              <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between transition-colors ${
                stressResult.validated 
                  ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-950 border-emerald-500/40 text-emerald-300' 
                  : isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-950 border-rose-500/40 text-rose-300'
              }`}>
                <span>{stressResult.validated ? "✓ KMP and Brute Force results match identically." : "⚠ Validation warning"}</span>
                <span className="text-slate-400">Size: {stressSize.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border rounded-lg p-4 space-y-3 font-mono transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>KMP Algorithm</span>
                    <span className="text-indigo-600 dark:text-indigo-400">O(n + m)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800/50'}`}>
                      <span className="text-slate-400 text-[10px] block">Time</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{stressResult.kmp.timeMs.toFixed(2)} ms</span>
                    </div>
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800/50'}`}>
                      <span className="text-slate-400 text-[10px] block">Comparisons</span>
                      <span className="text-indigo-600 dark:text-indigo-300 font-bold">{stressResult.kmp.comparisons.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-lg p-4 space-y-3 font-mono transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Brute Force</span>
                    <span className="text-rose-500 dark:text-rose-400">O(n × m)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800/50'}`}>
                      <span className="text-slate-400 text-[10px] block">Time</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{stressResult.bf.timeMs.toFixed(2)} ms</span>
                    </div>
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800/50'}`}>
                      <span className="text-slate-400 text-[10px] block">Comparisons</span>
                      <span className="text-rose-600 dark:text-rose-300 font-bold">{stressResult.bf.comparisons.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {stressResult.bf.comparisons > 0 && (
                <div className={`border rounded-lg p-4 text-xs font-mono transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  Efficiency: KMP performed <strong className="text-emerald-600 dark:text-emerald-400">
                    {(( (stressResult.bf.comparisons - stressResult.kmp.comparisons) / stressResult.bf.comparisons ) * 100).toFixed(1)}% fewer comparisons
                  </strong> than Brute Force.
                </div>
              )}
            </div>
          )}

          {/* Benchmark History Table */}
          <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Benchmark History</span>
              <button onClick={() => setBenchmarkHistory([])} className="hover:text-rose-500 transition-colors">Clear</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-slate-400 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <th className="py-2 px-2">Size</th>
                    <th className="py-2 px-2">Pattern</th>
                    <th className="py-2 px-2 text-right">KMP Comps</th>
                    <th className="py-2 px-2 text-right">BF Comps</th>
                    <th className="py-2 px-2 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/40 text-slate-300'}`}>
                  {benchmarkHistory.map(row => (
                    <tr key={row.id}>
                      <td className="py-2 px-2 text-indigo-600 dark:text-indigo-300">{row.size.toLocaleString()}</td>
                      <td className="py-2 px-2 text-slate-400">"{row.pattern}"</td>
                      <td className="py-2 px-2 text-right">{row.kmpComp.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-300">{row.bfComp.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">+{row.efficiency}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Viva Modal */}
        {vivaExplanationModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`border rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">🎓 Viva Analysis</h3>
                <button onClick={() => setVivaExplanationModal(false)} className="text-slate-400 text-xs">✕</button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                As dataset sizes increase, Brute Force comparisons scale quadratically in worst-case scenarios (<code className="text-rose-500 font-mono">O(n × m)</code>), whereas KMP maintains linear efficiency (<code className="text-indigo-600 dark:text-indigo-400 font-mono">O(n + m)</code>) by using the LPS array to avoid redundant text re-scans.
              </p>
              <div className="flex justify-end">
                <button onClick={() => setVivaExplanationModal(false)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Algorithm Comparison Table */}
        <section id="comparison" className={`border rounded-lg p-5 space-y-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="space-y-1">
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Algorithm Comparison</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Performance metrics on current active input.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className={`border-b text-slate-400 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <th className="py-2.5 px-3 font-sans">Metric</th>
                  <th className="py-2.5 px-3 text-right">Brute Force</th>
                  <th className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">KMP Algorithm</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/40 text-slate-300'}`}>
                <tr>
                  <td className="py-3 px-3 font-sans text-slate-800 dark:text-slate-200">Comparisons</td>
                  <td className="py-3 px-3 text-right">{bruteForceResult.comparisons.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-300 font-bold">{searchResult.comparisons.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-sans text-slate-800 dark:text-slate-200">Time Complexity</td>
                  <td className="py-3 px-3 text-right text-rose-500 dark:text-rose-400">O(n × m)</td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">O(n + m)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Viva Section */}
        <section id="viva" className={`border rounded-lg p-5 space-y-4 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="space-y-1">
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>KMP Quick Viva Guide</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Key conceptual Q&A for college presentation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className={`border rounded p-3.5 space-y-1.5 transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">What does KMP stand for?</span>
              <p className="text-slate-500 dark:text-slate-400">Knuth–Morris–Pratt string matching algorithm.</p>
            </div>
            <div className={`border rounded p-3.5 space-y-1.5 transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">What is the LPS array?</span>
              <p className="text-slate-500 dark:text-slate-400">Longest Proper Prefix which is also a Suffix.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className={`border-t py-6 mt-12 text-center text-xs text-slate-400 transition-colors ${
        isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
      }`}>
        <p>Efficient Text Searching Using KMP Algorithm | DAA Project</p>
      </footer>
    </div>
  );
}
