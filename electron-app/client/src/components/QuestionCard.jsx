import React from 'react';

const QuestionCard = ({ question, index, selectedOption, onSelectOption }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 mb-6">
            <h3 className="text-xl text-slate-100 font-semibold mb-6 flex items-start">
                <span className="text-blue-500 mr-3">Q{index + 1}.</span>
                {question.text}
            </h3>

            <div className="space-y-3">
                {question.options.map((option, i) => (
                    <label
                        key={i}
                        className={\`flex items-center p-4 rounded-lg cursor-pointer transition-colors border \${selectedOption === i ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-700/50 border-transparent hover:bg-slate-700'}\`}
          >
                <input
                    type="radio"
                    name={\`question-\${index}\`}
                value={i}
                checked={selectedOption === i}
                onChange={() => onSelectOption(index, i)}
                className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:ring-2"
            />
                <span className="ml-3 text-slate-300 text-lg">{option}</span>
            </label>
        ))}
        </div>
    </div >
  );
};

export default QuestionCard;
