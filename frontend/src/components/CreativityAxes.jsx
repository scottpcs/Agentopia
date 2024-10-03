import React from 'react';

const CreativityAxes = ({ value, onChange }) => {
  const handleClick = (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((rect.bottom - event.clientY) / rect.height) * 100);
    onChange({ x, y });
  };

  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold mb-2">Creativity</h3>
      <div className="flex items-center justify-center">
        <div 
          className="w-56 h-56 border border-gray-300 relative cursor-pointer bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg shadow-inner"
          onClick={handleClick}
        >
          <div 
            className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-md transform -translate-x-1/2 translate-y-1/2"
            style={{ left: `${value.x}%`, bottom: `${value.y}%` }}
          />
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full text-xs font-medium text-gray-600 mt-1">
            Effusive
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full text-xs font-medium text-gray-600 mb-1">
            Reserved
          </div>
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full text-xs font-medium text-gray-600 ml-1 rotate-90">
            Grounded
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-full text-xs font-medium text-gray-600 mr-1 -rotate-90">
            Imaginative
          </div>
        </div>
      </div>
      <p className="text-xs mt-2 text-gray-600 text-center">
        X: {value.x} (Grounded - Imaginative), Y: {value.y} (Reserved - Effusive)
      </p>
    </div>
  );
};

export default CreativityAxes;