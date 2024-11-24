import React, { useState } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';

const SampleComponent = ({ title }) => {
  // Component props
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

const handleClick = () => {
  // Handle button click event
setCount(prev => prev + 1);
  };

return (
<div>
<h1>{title}</h1>
<p>Count: {count}</p>
<button onClick={handleClick}>Increment</button>
</div>
);
};




// Component created for testing purposes

export default SampleComponent;