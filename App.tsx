
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateSourceSummary } from './services/geminiService';
import { INITIAL_SOURCES } from './constants';
import { Source, SourceSummary } from './types';
import { BookIcon, LoaderIcon, ErrorIcon, InfoIcon, BrainCircuitIcon, KeyIcon } from './components/icons';

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
    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{source.citation}</p>
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
                elements.push(<p key={index} className="text-slate-600 dark:text-slate-400">{line}</p>);
            }
        }
    });
    
    endList('ul-final');

    return <>{elements}</>;
};


const isSummaryEffectivelyEmpty = (summary: SourceSummary | undefined | null): boolean => {
    if (!summary || !summary.rawResponse) return true;
    const cleanedResponse = summary.rawResponse.trim();
    return cleanedResponse === '' || cleanedResponse.includes("kunne desværre ikke finde");
};

const SourceDetail: React.FC<{ source: Source; isLoading: boolean; error: string | null }> = ({ source, isLoading, error }) => {
  const summaryIsEmpty = isSummaryEffectivelyEmpty(source.summary);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
            <span className="text-slate-400 dark:text-slate-500 mr-3"><BookIcon /></span>
            Selected Source
        </h2>
        <p className="text-slate-600 dark:text-slate-400">{source.citation}</p>
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400">
          <LoaderIcon className="animate-spin h-10 w-10 mb-4" />
          <p className="font-semibold">Genererer resumé...</p>
          <p className="text-sm">Et øjeblik, Gemini analyserer kilden.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col items-center justify-center text-center p-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
           <ErrorIcon className="h-10 w-10 mb-4" />
          <p className="font-semibold">Der opstod en fejl</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && source.summary && (
        <>
            {summaryIsEmpty ? (
                 <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400">
                    <InfoIcon className="h-12 w-12 mb-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="font-semibold text-lg">Ingen Oplysninger Fundet</h3>
                    <p>AI-modellen kunne desværre ikke finde et specifikt resumé for den valgte kilde.</p>
                 </div>
            ) : (
                <div className="animate-fade-in">
                    <SimpleMarkdownRenderer content={source.summary.rawResponse} />
                    
                    {source.summary.groundingSources && source.summary.groundingSources.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">Kilder brugt af AI</h4>
                          <ul className="list-disc pl-5 space-y-1">
                              {source.summary.groundingSources.map((gs, index) => (
                                  <li key={index} className="text-sm">
                                      <a href={gs.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">
                                          {gs.title || gs.uri}
                                      </a>
                                  </li>
                              ))}
                          </ul>
                      </div>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
};

const WelcomeMessage: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-8">
        <BrainCircuitIcon className="h-16 w-16 mb-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Akademisk Kildekatalog</h2>
        <p className="max-w-md">Vælg en kilde fra listen til venstre for at få et AI-genereret resumé af dens centrale teorier, pointer og modeller.</p>
    </div>
);

const SelectApiKeyView: React.FC<{ onSelectKey: () => void; error: string | null }> = ({ onSelectKey, error }) => (
    <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-slate-900/5 m-4">
            <KeyIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vælg en API-nøgle</h2>
            
            {error ? (
                 <p className="text-red-500 dark:text-red-400 text-base mb-6" role="alert">{error}</p>
            ) : (
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    For at bruge denne app skal du vælge en API-nøgle fra et Google Cloud-projekt, hvor fakturering er aktiveret. Dette er et krav for at kunne slå kilder op med Google Search.
                </p>
            )}

            <div className="flex flex-col items-center space-y-4">
                 <button
                    onClick={onSelectKey}
                    className="w-full bg-sky-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                    aria-label={error ? "Vælg en anden API-nøgle" : "Vælg API-nøgle"}
                >
                    {error ? "Vælg en anden API-nøgle" : "Vælg API-nøgle"}
                </button>
                <a
                    href="https://ai.google.dev/gemini-api/docs/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
                >
                    Lær mere om fakturering
                </a>
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  type ApiKeyStatus = 'checking' | 'ready' | 'needed';
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('checking');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const selectedSource = useMemo(() => sources.find(s => s.id === selectedSourceId) || null, [sources, selectedSourceId]);

  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore - aistudio is a global provided by the platform
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          // @ts-ignore
          if (await window.aistudio.hasSelectedApiKey()) {
            setApiKeyStatus('ready');
          } else {
            setApiKeyStatus('needed');
          }
      } else {
        console.warn("AI Studio context not found, assuming API key is in environment.");
        setApiKeyStatus('ready'); // Fallback for local development
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    setApiKeyError(null); // Clear previous errors
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setApiKeyStatus('ready');
    } catch (error) {
      console.error("Error opening API key selection:", error);
    }
  };

  const handleSourceSelect = useCallback(async (id: number) => {
    if (selectedSourceId === id || isLoading) {
      return;
    }

    setSelectedSourceId(id);
    setError(null);

    const sourceToUpdate = sources.find(s => s.id === id);
    if (!sourceToUpdate || sourceToUpdate.summary) {
      return;
    }
    
    setIsLoading(true);
    try {
      const summary = await generateSourceSummary(sourceToUpdate.citation);
      setSources(prevSources =>
        prevSources.map(s =>
          s.id === id ? { ...s, summary } : s
        )
      );
    } catch (e: any) {
      const errorMessage = e.message?.toLowerCase() || 'en ukendt fejl opstod.';
      
      const isApiKeyError = errorMessage.includes('requested entity was not found') ||
                            errorMessage.includes('api key not valid') ||
                            errorMessage.includes('api-nøglen er ugyldig eller mangler');

      if (isApiKeyError) {
          setApiKeyError("Den valgte API-nøgle virker ikke. Det er sandsynligvis fordi, fakturering ikke er slået til for projektet. Denne app kræver fakturering for at bruge Google Search. Vælg venligst en anden nøgle.");
          setApiKeyStatus('needed');
          setIsLoading(false);
          return;
      }

      let userFriendlyMessage = "Der opstod en teknisk fejl under generering af resumé. Prøv venligst igen.";
      if (errorMessage.includes('blocked')) {
        userFriendlyMessage = `Anmodningen blev blokeret af sikkerhedshensyn.`;
      } else if (errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || errorMessage.includes('503')) {
        userFriendlyMessage = "AI-modellen er i øjeblikket overbelastet. Vent et øjeblik, og prøv venligst igen.";
      } else if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
        userFriendlyMessage = "Anmodningsgrænsen for API-nøglen er nået. Vent venligst, og prøv igen.";
      }

      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSourceId, isLoading, sources]);
  
  if (apiKeyStatus === 'checking') {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
            <LoaderIcon className="h-12 w-12 animate-spin text-slate-500" />
        </div>
    );
  }

  if (apiKeyStatus === 'needed') {
      return <SelectApiKeyView onSelectKey={handleSelectKey} error={apiKeyError} />;
  }

  return (
    <main className="h-screen w-screen overflow-hidden antialiased text-slate-800 dark:text-slate-200">
        <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)] bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 rounded-lg m-4">
            {/* Left Panel: Source List */}
            <div className="w-full md:w-1/3 lg:w-2/5 border-r border-slate-200 dark:border-slate-700 overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Akademisk Kildekatalog</h1>
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
                  </ul>
                </nav>
            </div>
            {/* Right Panel: Content */}
            <div className="w-full md:w-2/3 lg:w-3/5 overflow-y-auto">
                {selectedSource ? (
                    <SourceDetail source={selectedSource} isLoading={isLoading} error={error} />
                ) : (
                    <WelcomeMessage />
                )}
            </div>
        </div>
    </main>
  );
};

export default App;
