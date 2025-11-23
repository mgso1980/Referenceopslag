
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { INITIAL_SOURCES } from './constants';
import { Source } from './types';
import { BookIcon, InfoIcon, BrainCircuitIcon, PlusIcon, PenIcon, SparklesIcon } from './components/icons';
import { generateExpandedSummary } from './services/geminiService';

const SourceListItem: React.FC<{ source: Source; onSelect: () => void; isSelected: boolean }> = ({ source, onSelect, isSelected }) => (
  <li
    onClick={onSelect}
    className={`p-4 border-l-4 cursor-pointer transition-all duration-200 ${
      isSelected
        ? 'bg-sky-100 dark:bg-sky-900/50 border-sky-500'
        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
    aria-selected={isSelected}
    role="option"
  >
    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-3">{source.citation}</p>
    {source.userNotes && (
        <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Har noter
        </span>
    )}
  </li>
);

// Renders a simple subset of Markdown
const SimpleMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const endList = (key: string) => {
        if (listItems.length > 0) {
            elements.push(<ul key={key} className="space-y-2 mb-4 list-disc pl-5">{listItems}</ul>);
            listItems = [];
        }
    };

    content.split('\n').forEach((line, index) => {
        if (line.startsWith('### ')) {
            endList(`ul-end-${index}`);
            elements.push(<h3 key={index} className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">{line.substring(4)}</h3>);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(<li key={index} className="text-slate-600 dark:text-slate-400">{line.substring(2)}</li>);
        } else {
            endList(`ul-end-${index}`);
            if (line.trim() !== '') {
                elements.push(<p key={index} className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{line}</p>);
            }
        }
    });
    
    endList('ul-final');

    return <>{elements}</>;
};

const SourceDetail: React.FC<{ 
    source: Source; 
    onUpdateNotes: (notes: string) => void;
    onGenerateSummary: (citation: string) => Promise<void>;
}> = ({ source, onUpdateNotes, onGenerateSummary }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
        await onGenerateSummary(source.citation);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 h-full flex flex-col">
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <span className="text-slate-400 dark:text-slate-500 mr-3"><BookIcon /></span>
                Valgt Kilde
            </h2>
            <p className="text-slate-600 dark:text-slate-400 italic">{source.citation}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {/* Summary Section */}
          <section>
              {source.summary ? (
                <div className="animate-fade-in">
                    <SimpleMarkdownRenderer content={source.summary} />
                </div>
              ) : (
                 <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <InfoIcon className="h-10 w-10 mb-3 text-slate-400 dark:text-slate-500" />
                    <h3 className="font-semibold text-base mb-2">Resumé Ikke Tilgængeligt</h3>
                    <p className="text-sm mb-6 max-w-xs mx-auto">Der er endnu ikke tilføjet et automatisk resumé for denne kilde. Klik nedenfor for at lade AI generere et.</p>
                    <button 
                        onClick={handleGenerateClick}
                        disabled={isGenerating}
                        className={`flex items-center px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${
                            isGenerating 
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-sky-600 hover:bg-sky-700 shadow-sm'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Genererer Resumé...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Generer AI Resumé
                            </>
                        )}
                    </button>
                 </div>
              )}
          </section>

          {/* Notes Section */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                <PenIcon className="w-5 h-5 mr-2 text-sky-500" />
                Mine Noter
            </h3>
            <p className="text-sm text-slate-500 mb-3">Her kan du skrive dine egne refleksioner om kilden. De gemmes automatisk i din browser.</p>
            <textarea
                className="w-full h-48 p-4 bg-yellow-50 dark:bg-slate-900 border border-yellow-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none shadow-sm placeholder-slate-400 dark:placeholder-slate-600 text-sm leading-relaxed"
                placeholder="Skriv dine noter her..."
                value={source.userNotes || ''}
                onChange={(e) => onUpdateNotes(e.target.value)}
            />
          </section>
      </div>
    </div>
  );
};

const AddSourceModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (citation: string) => void }> = ({ isOpen, onClose, onAdd }) => {
    const [citation, setCitation] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (citation.trim()) {
            onAdd(citation);
            setCitation('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tilføj Ny Kilde</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Kildehenvisning (Citation)
                    </label>
                    <textarea
                        className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                        placeholder="Indsæt APA citation eller bogtitel her..."
                        value={citation}
                        onChange={(e) => setCitation(e.target.value)}
                        autoFocus
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                        >
                            Annuller
                        </button>
                        <button
                            type="submit"
                            disabled={!citation.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tilføj Kilde
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WelcomeMessage: React.FC<{ onAddSource: () => void }> = ({ onAddSource }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-8">
        <BrainCircuitIcon className="h-16 w-16 mb-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Akademisk Kildekatalog</h2>
        <p className="max-w-md mb-8">Vælg en kilde fra listen til venstre for at se resumé og skrive noter, eller tilføj dine egne kilder.</p>
        <button 
            onClick={onAddSource}
            className="flex items-center px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-full font-medium transition-colors shadow-md"
        >
            <PlusIcon className="w-5 h-5 mr-2" />
            Tilføj din egen kilde
        </button>
    </div>
);

const App: React.FC = () => {
  // Initialize state from local storage or default constants
  const [sources, setSources] = useState<Source[]>(() => {
      try {
          const savedData = localStorage.getItem('academic-source-catalog-data');
          if (savedData) {
              return JSON.parse(savedData);
          }
      } catch (e) {
          console.error("Failed to load from local storage", e);
      }
      return INITIAL_SOURCES;
  });

  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Persist to local storage whenever sources change
  useEffect(() => {
      try {
          localStorage.setItem('academic-source-catalog-data', JSON.stringify(sources));
      } catch (e) {
          console.error("Failed to save to local storage", e);
      }
  }, [sources]);

  const selectedSource = useMemo(() => sources.find(s => s.id === selectedSourceId) || null, [sources, selectedSourceId]);

  const handleSourceSelect = useCallback((id: number) => {
    setSelectedSourceId(id);
  }, []);

  const handleUpdateNotes = useCallback((newNotes: string) => {
      setSources(prevSources => 
        prevSources.map(s => 
            s.id === selectedSourceId ? { ...s, userNotes: newNotes } : s
        )
      );
  }, [selectedSourceId]);

  const handleAddSource = useCallback((citation: string) => {
      setSources(prev => {
          const maxId = prev.length > 0 ? Math.max(...prev.map(s => s.id)) : 0;
          const newSource: Source = {
              id: maxId + 1,
              citation: citation,
              summary: undefined, // New sources start without a summary
              userNotes: ''
          };
          // Automatically select the new source
          setSelectedSourceId(newSource.id);
          return [...prev, newSource];
      });
  }, []);

  const handleGenerateSummary = useCallback(async (citation: string) => {
    if (!selectedSourceId) return;
    
    try {
        const summary = await generateExpandedSummary(citation);
        setSources(prev => 
            prev.map(s => 
                s.id === selectedSourceId ? { ...s, summary } : s
            )
        );
    } catch (error) {
        console.error("Failed to generate summary:", error);
        alert("Der opstod en fejl under generering af resuméet. Kontroller din internetforbindelse og API-nøgle.");
    }
  }, [selectedSourceId]);

  return (
    <main className="h-screen w-screen overflow-hidden antialiased text-slate-800 dark:text-slate-200">
        <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)] bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 rounded-lg m-4">
            {/* Left Panel: Source List */}
            <div className="w-full md:w-1/3 lg:w-2/5 border-r border-slate-200 dark:border-slate-700 overflow-y-auto flex flex-col bg-slate-50/50 dark:bg-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Kilder</h1>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-full transition-colors"
                        title="Tilføj ny kilde"
                        aria-label="Add new source"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-1">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700" role="listbox" aria-label="Academic Sources">
                    {sources.map(source => (
                      <SourceListItem
                        key={source.id}
                        source={source}
                        onSelect={() => handleSourceSelect(source.id)}
                        isSelected={selectedSourceId === source.id}
                      />
                    ))}
                    {sources.length === 0 && (
                        <li className="p-8 text-center text-slate-500 text-sm">Ingen kilder endnu. Tilføj en for at komme i gang.</li>
                    )}
                  </ul>
                </nav>
            </div>
            {/* Right Panel: Content */}
            <div className="w-full md:w-2/3 lg:w-3/5 overflow-hidden h-full">
                {selectedSource ? (
                    <SourceDetail 
                        source={selectedSource} 
                        onUpdateNotes={handleUpdateNotes}
                        onGenerateSummary={handleGenerateSummary}
                    />
                ) : (
                    <WelcomeMessage onAddSource={() => setIsAddModalOpen(true)} />
                )}
            </div>
        </div>

        <AddSourceModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddSource} 
        />
    </main>
  );
};

export default App;
