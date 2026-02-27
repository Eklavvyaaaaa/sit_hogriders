import React from 'react';

const QuestionCard = ({ question, index, selectedOption, onSelectOption }) => {
    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 mb-8 font-inter">
            <h3 className="text-xl text-slate-900 font-bold mb-8 flex items-start">
                <span className="text-blue-600 mr-4 font-black">Question {index + 1}</span>
            </h3>

            <p className="text-lg text-slate-800 mb-8 leading-relaxed font-medium">
                {question.text}
            </p>

            <div className="space-y-4">
                {question.options.map((option, i) => (
                    <label
                        key={i}
                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedOption === i ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${selectedOption === i ? 'border-blue-600' : 'border-slate-300 bg-white'}`}>
                            {selectedOption === i && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                        </div>
                        <input
                            type="radio"
                            name={`question-${index}`}
                            value={i}
                            checked={selectedOption === i}
                            onChange={() => onSelectOption(index, i)}
                            className="hidden"
                        />
                        <span className={`text-[17px] font-semibold ${selectedOption === i ? 'text-blue-900' : 'text-slate-600'}`}>{option}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default QuestionCard;
