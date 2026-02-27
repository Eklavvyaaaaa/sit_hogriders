import React from 'react';

const QuestionCard = ({ question, index, selectedOption, onSelectOption, textAnswer, onTextAnswer }) => {
    const isSubjective = question.type === 'subjective';

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 mb-6">
            <div className="flex items-start justify-between mb-6">
                <h3 className="text-xl text-slate-100 font-semibold flex items-start">
                    <span className="text-blue-500 mr-3">Q{index + 1}.</span>
                    {question.text}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ml-4 ${isSubjective
                        ? 'bg-purple-900/30 text-purple-400 border-purple-900/50'
                        : 'bg-blue-900/30 text-blue-400 border-blue-900/50'
                    }`}>
                    {isSubjective ? 'Subjective' : 'MCQ'}
                </span>
            </div>

            {isSubjective ? (
                <textarea
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white min-h-[150px] resize-y"
                    placeholder="Type your answer here..."
                    value={textAnswer || ''}
                    onChange={e => onTextAnswer(index, e.target.value)}
                />
            ) : (
                <div className="space-y-3">
                    {question.options.map((option, i) => (
                        <label
                            key={i}
                            className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors border ${selectedOption === i ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-700/50 border-transparent hover:bg-slate-700'}`}
                        >
                            <input
                                type="radio"
                                name={`question-${index}`}
                                value={i}
                                checked={selectedOption === i}
                                onChange={() => onSelectOption(index, i)}
                                className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="ml-3 text-slate-300 text-lg">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div >
    );
};

export default QuestionCard;
