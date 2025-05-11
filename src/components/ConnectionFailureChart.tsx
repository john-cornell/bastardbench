import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f59e42', '#22c55e']; // Red, Orange, Green

export type FailureChartDatum = {
  type: string;
  value: number;
};

export interface ConnectionFailureChartProps {
  model: string;
  data: FailureChartDatum[];
}

export const ConnectionFailureChart: React.FC<ConnectionFailureChartProps> = ({ model, data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-2 text-gray-900">Connection & Answer Failures ({model})</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} (${((value / total) * 100).toFixed(1)}%)`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}; 