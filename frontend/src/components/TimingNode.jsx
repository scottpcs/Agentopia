import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Clock, AlertCircle, Check } from 'lucide-react';
import { eventSystem } from '../utils/eventSystem';

export const TIMING_MODES = {
    delay: {
      label: 'Delay',
      description: 'Pause workflow for specified duration'
    },
    deadline: {
      label: 'Deadline',
      description: 'Set time limit with success/failure paths'
    },
    watchdog: {
      label: 'Watchdog',
      description: 'Monitor for inactivity'
    },
    coordination: {
      label: 'Coordination',
      description: 'Synchronize multiple conditions'
    }
  };

const TimingNode = ({ id, data, isConnectable }) => {
  // State
  const [status, setStatus] = useState('idle'); // idle, running, completed, timeout
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [conditions, setConditions] = useState(new Set());

  // Parse timing configuration
  const {
    mode = 'delay',
    duration = 60000, // Default: 1 minute
    conditions: requiredConditions = [],
    resetOnActivity = false,
    cancelOnTimeout = false
  } = data.config || {};

  // Timer management
  const startTimer = useCallback(() => {
    if (status === 'running') return;

    const endTime = Date.now() + duration;
    setStatus('running');
    setTimeRemaining(duration);

    const interval = setInterval(() => {
      const remaining = endTime - Date.now();
      setTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 1000);

    setTimerInterval(interval);

    // Emit timing event
    eventSystem.emit('timing:start', {
      nodeId: id,
      mode,
      duration,
      endTime
    });
  }, [id, mode, duration, status]);

  const stopTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setStatus('idle');
    setTimeRemaining(null);

    // Emit timing event
    eventSystem.emit('timing:stop', {
      nodeId: id,
      mode
    });
  }, [id, mode, timerInterval]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    setStatus('timeout');
    stopTimer();

    if (data.onChange) {
      data.onChange(id, {
        status: 'timeout',
        output: {
          type: 'timeout',
          timestamp: Date.now()
        }
      });
    }

    // Emit timing event
    eventSystem.emit('timing:timeout', {
      nodeId: id,
      mode
    });
  }, [id, mode, data.onChange, stopTimer]);

  // Handle completion
  const handleComplete = useCallback(() => {
    setStatus('completed');
    stopTimer();

    if (data.onChange) {
      data.onChange(id, {
        status: 'completed',
        output: {
          type: 'complete',
          timestamp: Date.now()
        }
      });
    }

    // Emit timing event
    eventSystem.emit('timing:complete', {
      nodeId: id,
      mode
    });
  }, [id, mode, data.onChange, stopTimer]);

  // Handle activity for watchdog mode
  const handleActivity = useCallback(() => {
    if (mode === 'watchdog' && resetOnActivity && status === 'running') {
      stopTimer();
      startTimer();

      // Emit timing event
      eventSystem.emit('timing:reset', {
        nodeId: id,
        mode,
        reason: 'activity'
      });
    }
  }, [id, mode, resetOnActivity, status, startTimer, stopTimer]);

  // Handle condition updates for coordination mode
  const handleConditionMet = useCallback((conditionId) => {
    if (mode === 'coordination') {
      const updatedConditions = new Set(conditions);
      updatedConditions.add(conditionId);
      setConditions(updatedConditions);

      // Check if all conditions are met
      if (requiredConditions.every(c => updatedConditions.has(c))) {
        handleComplete();
      }
    }
  }, [mode, conditions, requiredConditions, handleComplete]);

  // Effect for handling input
  useEffect(() => {
    if (data.input && status === 'idle') {
      startTimer();
    }
  }, [data.input, status, startTimer]);

  // Effect for cleanup
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Subscribe to timing events
  useEffect(() => {
    const handleTimingEvent = (event) => {
      if (event.nodeId === id) return; // Ignore own events

      switch (event.type) {
        case 'activity':
          handleActivity();
          break;
        case 'condition':
          handleConditionMet(event.conditionId);
          break;
        case 'cancel':
          if (cancelOnTimeout) {
            stopTimer();
          }
          break;
      }
    };

    eventSystem.on('timing', handleTimingEvent);
    return () => eventSystem.off('timing', handleTimingEvent);
  }, [id, handleActivity, handleConditionMet, stopTimer, cancelOnTimeout]);

  return (
    <div className="timing-node bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4 w-64">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />

      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-500" />
        <div className="font-bold">{TIMING_MODES[mode].label}</div>
      </div>

      <Card className="mb-4 p-3">
        <div className="text-sm mb-2">{TIMING_MODES[mode].description}</div>
        {timeRemaining !== null && (
          <div className="text-sm font-mono">
            Time remaining: {Math.ceil(timeRemaining / 1000)}s
          </div>
        )}
        {status === 'running' && mode === 'coordination' && (
          <div className="text-sm mt-2">
            Conditions met: {conditions.size}/{requiredConditions.length}
          </div>
        )}
      </Card>

          {/* Add the lastOutput display here */}
          {data.lastOutput && (
            <div className="text-xs mb-2 p-2 bg-gray-100 rounded">
              Last output: {
                typeof data.lastOutput === 'object'
                  ? JSON.stringify(data.lastOutput)
                  : data.lastOutput
              }
            </div>
          )}


      {status === 'timeout' && (
        <div className="flex items-center gap-2 text-red-500 mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Timeout occurred</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-2 text-green-500 mb-4">
          <Check className="w-4 h-4" />
          <span className="text-sm">Completed</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="complete"
        style={{ background: '#555', left: '25%' }}
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        style={{ background: '#555', left: '75%' }}
        isConnectable={isConnectable}
      />

      {/* Handle labels */}
      <div className="text-xs text-gray-500 absolute -bottom-6 left-[25%] transform -translate-x-1/2">
        Complete
      </div>
      <div className="text-xs text-gray-500 absolute -bottom-6 left-[75%] transform -translate-x-1/2">
        Timeout
      </div>
    </div>
  );
};

export default TimingNode;