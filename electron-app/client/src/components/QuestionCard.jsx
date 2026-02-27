import React from 'react';

const QuestionCard = ({ question, index, selectedOption, onSelectOption, textAnswer, onTextAnswer }) => {
    const isSubjective = question.type === 'subjective';

    return (
        <div className="bg-white p-10 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 mb-8 font-inter relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transition-all group-hover:w-2"></div>

            <div className="flex justify-between items-start mb-8">
                <h3 className="text-xl text-slate-900 font-bold flex items-start">
                    <span className="text-blue-600 mr-4 font-black">Question {index + 1}</span>
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isSubjective
                    ? 'bg-purple-50 text-purple-600 border-purple-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                    {isSubjective ? 'Subjective' : 'MCQ'}
                </span>
            </div>

            <p className="text-xl text-slate-800 mb-10 leading-relaxed font-semibold">
                {question.text}
            </p>

            {isSubjective ? (
                <div className="space-y-4 animate-fade-in">
                    <textarea
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium min-h-[220px] resize-none leading-relaxed"
                        placeholder="Type your detailed response here..."
                        value={textAnswer || ''}
                        onChange={e => onTextAnswer(index, e.target.value)}
                    />
                    <div className="flex justify-end">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            {textAnswer?.length || 0} characters
                        </span>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    {question.options.map((option, i) => (
                        <label
                            key={i}
                            className={`flex items-center p-5 rounded-2xl cursor-pointer transition-all border-2 ${selectedOption === i
                                ? 'bg-blue-50 border-blue-600 shadow-md shadow-blue-100'
                                : 'bg-slate-50 border-slate-50 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-5 transition-all ${selectedOption === i ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'
                                }`}>
                                {selectedOption === i && <div className="w-3 h-3 rounded-full bg-blue-600 animate-scale"></div>}
                            </div>
                            <input
                                type="radio"
                                name={`question-${index}`}
                                value={i}
                                checked={selectedOption === i}
                                onChange={() => onSelectOption(index, i)}
                                className="sr-only"
                            />
                            <span className={`text-lg font-bold ${selectedOption === i ? 'text-blue-900' : 'text-slate-600'}`}>
                                {option}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionCard;
