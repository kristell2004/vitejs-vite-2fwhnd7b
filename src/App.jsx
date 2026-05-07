import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import {
  MessageSquare,
  UserCircle,
  Eye,
  Clock,
  Search,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Wand2,
  BookOpen,
  Send,
  RefreshCw,
  Trophy,
} from 'lucide-react';

// API Configuration
const apiKey = '';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';

const App = () => {
  const [view, setView] = useState('infographic'); // 'infographic' or 'tools'
  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refiner State
  const [draftMessage, setDraftMessage] = useState('');
  const [refinedMessage, setRefinedMessage] = useState('');

  // Simulator State
  const [simMessages, setSimMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [simFeedback, setSimFeedback] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [simMessages]);

  const lineamientos = [
    {
      title: 'A de Agilidad: Sin Doble Saludo',
      subtitle: 'Evita la redundancia',
      description:
        'El sistema ya envía un saludo automático. No pierdas tiempo saludando de nuevo manualmente; ve directo al grano para una experiencia más fluida.',
      icon: <MessageSquare className="w-12 h-12 text-pink-500" />,
      color: 'bg-pink-50',
      accent: 'border-pink-500',
      tip: 'Recuerda: Menos es más al iniciar.',
    },
    {
      title: 'B de Buen Trato: Personaliza',
      subtitle: 'Conecta con el Partner',
      description:
        "Revisa el campo 'rop_name'. Si llega vacío, ¡pregunta el nombre! Llamar a alguien por su nombre transforma una transacción en una conversación.",
      icon: <UserCircle className="w-12 h-12 text-blue-500" />,
      color: 'bg-blue-50',
      accent: 'border-blue-500',
      tip: 'Usa el nombre al menos 2 veces en el chat.',
    },
    {
      title: 'C de Comprensión: Lectura Activa',
      subtitle: 'Entiende antes de preguntar',
      description:
        'Antes de lanzar la primera pregunta, lee todo lo que el partner ya escribió. No le pidas datos que ya te dio; eso genera frustración.',
      icon: <Eye className="w-12 h-12 text-purple-500" />,
      color: 'bg-purple-50',
      accent: 'border-purple-500',
      tip: 'Tómate 10 segundos extra para leer el historial.',
    },
    {
      title: 'D de Dinamismo: Holdtime Adecuado',
      subtitle: 'Regla del minuto de oro',
      description:
        'Nunca dejes pasar más de 1 minuto sin hablar. Si estás validando, regresa cada 60 segundos para decirle al partner que sigues ahí.',
      icon: <Clock className="w-12 h-12 text-orange-500" />,
      color: 'bg-orange-50',
      accent: 'border-orange-500',
      tip: 'El silencio largo se siente como abandono.',
    },
    {
      title: 'E de Empatía: Chequeo de Caso',
      subtitle: 'Pide permiso, no solo tiempo',
      description:
        "Si necesitas investigar, hazlo con amabilidad. Usa frases como: '¿Me permites unos minutos para revisar tu consulta, por favor?'",
      icon: <Search className="w-12 h-12 text-green-500" />,
      color: 'bg-green-50',
      accent: 'border-green-500',
      tip: 'La cortesía abre puertas y baja tensiones.',
    },
    {
      title: 'F de Fidelidad: Soluciones Oficiales',
      subtitle: 'Voz de marca + Tu toque personal',
      description:
        'Usa las soluciones oficiales para mantener la alineación, pero mézclalas con tu redacción propia y habilidades blandas para sonar humano.',
      icon: <Sparkles className="w-12 h-12 text-red-500" />,
      color: 'bg-red-50',
      accent: 'border-red-500',
      tip: 'Sé un experto con alma, no un robot.',
    },
  ];

  // Helper: Call Gemini API with Exponential Backoff
  const callGemini = async (prompt, systemInstruction = '') => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
    };

    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        if (i === 4) throw err;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  };

  // Logic: Refine Message ✨
  const handleRefine = async () => {
    if (!draftMessage.trim()) return;
    setIsGenerating(true);
    try {
      const systemPrompt =
        "Eres un experto en Customer Experience para PedidosYa. Tu objetivo es mejorar los borradores de los agentes siguiendo el 'ABC de los Chats': evitar doble saludo, usar el nombre del partner, empatía, lectura activa y soluciones oficiales con toque humano. Responde en un formato JSON simple: { refined: 'mensaje mejorado', explanation: 'por qué es mejor' }";
      const userPrompt = `Mejora este mensaje de chat para un partner: "${draftMessage}". El nombre del partner es Juan.`;

      const resultText = await callGemini(userPrompt, systemPrompt);
      // Clean resultText in case it has markdown blocks
      const cleaned = resultText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setRefinedMessage(parsed);
    } catch (error) {
      console.error(error);
      setRefinedMessage({
        refined: 'Error al conectar con la IA. Intenta de nuevo.',
        explanation: '',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Logic: Simulator ✨
  const startSimulation = async () => {
    setSimMessages([
      {
        role: 'system',
        text: 'Iniciando simulación... Eres un agente de PedidosYa. Un partner acaba de entrar al chat.',
      },
      {
        role: 'partner',
        text: "Hola, soy Carlos de 'La Pizzería'. Tengo un problema con un pedido que no aparece en mi sistema pero el repartidor ya llegó.",
      },
    ]);
    setSimFeedback(null);
  };

  const handleSimSend = async () => {
    if (!userInput.trim() || isGenerating) return;

    const newMessages = [...simMessages, { role: 'agent', text: userInput }];
    setSimMessages(newMessages);
    setUserInput('');
    setIsGenerating(true);

    try {
      const chatContext = newMessages
        .map((m) => `${m.role}: ${m.text}`)
        .join('\n');
      const systemPrompt =
        'Actúa como un Partner (dueño de restaurante) de PedidosYa llamado Carlos. Sé un poco impaciente pero razonable. Si el agente comete errores del ABC (como doble saludo o no ser empático), actúa un poco frustrado. Mantén el diálogo corto.';
      const partnerReply = await callGemini(
        `Este es el chat actual:\n${chatContext}\nResponde como el partner Carlos:`,
        systemPrompt
      );

      setSimMessages((prev) => [
        ...prev,
        { role: 'partner', text: partnerReply },
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const finishAndAnalyze = async () => {
    setIsGenerating(true);
    try {
      const chatContext = simMessages
        .map((m) => `${m.role}: ${m.text}`)
        .join('\n');
      const systemPrompt = `Analiza el desempeño del agente basado en el ABC de los Chats:
      A. Sin Doble Saludo.
      B. Personalización (usar nombre 'Carlos').
      C. Lectura Activa.
      D. Holdtime (asume que el tiempo fue correcto si no hay quejas).
      E. Chequeo de Caso (¿pidió tiempo amablemente?).
      F. Soluciones Oficiales + Toque humano.
      
      Genera un feedback constructivo y una puntuación del 1 al 10. Responde en JSON: { score: number, feedback: string, achievements: string[] }`;

      const resultText = await callGemini(
        `Analiza esta conversación:\n${chatContext}`,
        systemPrompt
      );
      const cleaned = resultText.replace(/```json|```/g, '').trim();
      setSimFeedback(JSON.parse(cleaned));
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = () =>
    setActiveStep((prev) => (prev + 1) % lineamientos.length);
  const prevStep = () =>
    setActiveStep(
      (prev) => (prev - 1 + lineamientos.length) % lineamientos.length
    );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex gap-1">
            <button
              onClick={() => setView('infographic')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                view === 'infographic'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <BookOpen size={18} />
              <span className="font-semibold">Infografía ABC</span>
            </button>
            <button
              onClick={() => setView('tools')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                view === 'tools'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Wand2 size={18} />
              <span className="font-semibold">Herramientas ✨</span>
            </button>
          </div>
        </div>

        {view === 'infographic' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">
                El <span className="text-pink-600">ABC</span> de los Chats
              </h1>
              <p className="text-lg text-slate-600">
                Domina el arte de la atención al partner
              </p>
            </header>

            {/* Carousel / Card */}
            <div className="relative group max-w-4xl mx-auto">
              <div
                className={`transition-all duration-500 border-l-8 ${lineamientos[activeStep].accent} ${lineamientos[activeStep].color} rounded-2xl shadow-xl p-8 md:p-12 min-h-[420px] flex flex-col justify-center`}
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="bg-white p-6 rounded-full shadow-md flex-shrink-0">
                    {lineamientos[activeStep].icon}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                      Punto {activeStep + 1} de 6
                    </span>
                    <h2 className="text-3xl font-bold text-slate-900 mt-1 mb-2">
                      {lineamientos[activeStep].title}
                    </h2>
                    <h3 className="text-xl font-medium text-slate-600 mb-4 italic">
                      {lineamientos[activeStep].subtitle}
                    </h3>
                    <p className="text-slate-700 text-lg leading-relaxed mb-6">
                      {lineamientos[activeStep].description}
                    </p>
                    <div className="inline-block bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" /> TIP
                        PRO: {lineamientos[activeStep].tip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={prevStep}
                className="absolute left-[-20px] md:left-[-30px] top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all border border-slate-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextStep}
                className="absolute right-[-20px] md:right-[-30px] top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all border border-slate-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Mini Grid */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-6 gap-3 max-w-4xl mx-auto">
              {lineamientos.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    activeStep === idx
                      ? 'bg-white border-pink-500 ring-2 ring-pink-100 scale-105'
                      : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="scale-75 mb-1">{item.icon}</div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                    {item.title.split(':')[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tool 1: Refinador de Mensajes ✨ */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    Refinador de Mensajes ✨
                  </h2>
                  <p className="text-sm text-slate-500">
                    Convierte borradores en atención de oro
                  </p>
                </div>
              </div>

              <textarea
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all mb-4 resize-none"
                placeholder="Escribe tu borrador aquí (ej: Hola, ya te ayudo, dame un segundo...)"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
              />

              <button
                onClick={handleRefine}
                disabled={isGenerating || !draftMessage.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                Mejorar Mensaje ✨
              </button>

              {refinedMessage && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl animate-in zoom-in-95 duration-300">
                  <p className="text-xs font-bold text-green-700 uppercase mb-2">
                    Mensaje Refinado:
                  </p>
                  <p className="text-slate-800 italic mb-3 font-medium">
                    "{refinedMessage.refined}"
                  </p>
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-xs text-green-600">
                      <strong>¿Por qué funciona?</strong>{' '}
                      {refinedMessage.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tool 2: Simulador de Práctica ✨ */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Simulador de Chat ✨</h2>
                    <p className="text-sm text-slate-500">
                      Practica con situaciones reales
                    </p>
                  </div>
                </div>
                {simMessages.length > 0 && (
                  <button
                    onClick={finishAndAnalyze}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Finalizar y Evaluar
                  </button>
                )}
              </div>

              {simMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                  <div className="bg-slate-100 p-6 rounded-full mb-4">
                    <Trophy className="text-slate-300 w-12 h-12" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    ¿Listo para el desafío?
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Enfréntate a Carlos, un partner con un problema urgente.
                    ¡Usa el ABC!
                  </p>
                  <button
                    onClick={startSimulation}
                    className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all"
                  >
                    Empezar Entrenamiento
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto pr-2 space-y-4"
                  >
                    {simMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === 'agent' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                            msg.role === 'agent'
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : msg.role === 'system'
                              ? 'bg-slate-100 text-slate-500 text-center w-full italic font-medium'
                              : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 p-3 rounded-2xl animate-pulse text-slate-400 text-xs">
                          Carlos está escribiendo...
                        </div>
                      </div>
                    )}
                  </div>

                  {simFeedback ? (
                    <div className="bg-slate-900 text-white p-6 rounded-xl animate-in fade-in duration-500 overflow-y-auto h-full absolute inset-0 z-20 m-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-yellow-400">
                          Puntaje: {simFeedback.score}/10
                        </h3>
                        <button
                          onClick={() => setSimMessages([])}
                          className="text-slate-400 hover:text-white"
                        >
                          Cerrar
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed mb-4">
                        {simFeedback.feedback}
                      </p>
                      <h4 className="font-bold text-indigo-400 text-sm uppercase mb-2">
                        Logros:
                      </h4>
                      <ul className="space-y-1">
                        {simFeedback.achievements.map((a, i) => (
                          <li
                            key={i}
                            className="text-xs flex items-center gap-2"
                          >
                            <div className="w-1 h-1 bg-indigo-400 rounded-full" />{' '}
                            {a}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => {
                          setSimMessages([]);
                          startSimulation();
                        }}
                        className="mt-6 w-full bg-white text-slate-900 font-bold py-2 rounded-lg text-sm hover:bg-slate-100 transition-all"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSimSend()}
                        placeholder="Escribe tu respuesta de agente..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={handleSimSend}
                        disabled={isGenerating || !userInput.trim()}
                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="mt-12 text-center text-slate-400 text-sm border-t border-slate-200 pt-6">
          <p>
            Tu impronta y personalización son la clave para una atención humana
            y cercana.
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="font-bold text-pink-600">#VozYTonoPedidosYa</span>
            <span className="font-bold text-indigo-600">#GeminiMagic ✨</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
