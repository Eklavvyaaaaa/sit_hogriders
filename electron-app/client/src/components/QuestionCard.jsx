import React from 'react';

const QuestionCard = ({ question, index, selectedOption, onSelectOption, textAnswer, onTextAnswer }) => {
    const isSubjective = question.type === 'subjective';
    const imageUrl = question.image_url || null;

    return (
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}
            className="p-8 rounded-xl border mb-6 font-inter relative overflow-hidden group transition-colors duration-200">
            <div style={{ backgroundColor: 'var(--accent-color)' }} className="absolute top-0 left-0 w-1 h-full transition-all group-hover:w-1.5"></div>

            <div className="flex justify-between items-start mb-6">
                <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold flex items-start">
                    <span style={{ color: 'var(--accent-color)' }} className="mr-3 font-bold">Q{index + 1}</span>
                </h3>
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border ${isSubjective
                    ? 'bg-purple-50 text-purple-600 border-purple-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                    {isSubjective ? 'Subjective' : 'MCQ'}
                </span>
            </div>

            <p style={{ color: 'var(--text-primary)' }} className="text-lg mb-6 leading-relaxed font-medium">
                {question.text}
            </p>

            {/* Question Image */}
            {imageUrl && (
                <div className="mb-6">
                    <img
                        src={imageUrl}
                        alt={`Question ${index + 1} image`}
                        className="max-w-full max-h-80 rounded-lg border object-contain"
                        style={{ borderColor: 'var(--border-color)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}

            {isSubjective ? (
                <div className="space-y-3">
                    <textarea
                        className="input-field min-h-[200px] resize-none leading-relaxed"
                        placeholder="Type your detailed response here..."
                        value={textAnswer || ''}
                        onChange={e => onTextAnswer(index, e.target.value)}
                    />
                    <div className="flex justify-end">
                        <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-widest">
                            {textAnswer?.length || 0} characters
                        </span>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {question.options.map((option, i) => (
                        <label
                            key={i}
                            style={{
                                backgroundColor: selectedOption === i ? 'var(--accent-light)' : 'var(--input-bg)',
                                borderColor: selectedOption === i ? 'var(--accent-color)' : 'var(--input-border)'
                            }}
                            className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedOption === i ? 'shadow-sm' : 'hover:border-gray-300'}`}
                        >
                            <div style={{ borderColor: selectedOption === i ? 'var(--accent-color)' : 'var(--text-muted)' }}
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all">
                                {selectedOption === i && (
                                    <div style={{ backgroundColor: 'var(--accent-color)' }} className="w-2.5 h-2.5 rounded-full"></div>
                                )}
                            </div>
                            <input type="radio" name={`question-${index}`} value={i} checked={selectedOption === i}
                                onChange={() => onSelectOption(index, i)} className="sr-only" />
                            <span style={{ color: selectedOption === i ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                                className="text-base font-medium">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionCard;
