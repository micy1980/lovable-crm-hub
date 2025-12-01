import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SalesChartProps {
  data: Record<string, number>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  '#8884d8',
  '#82ca9d',
];

export const SalesChart = ({ data }: SalesChartProps) => {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Értékesítési pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    lead: 'Lead',
    qualified: 'Minősített',
    proposal: 'Ajánlat',
    negotiation: 'Tárgyalás',
    closed_won: 'Megnyert',
    closed_lost: 'Elveszett',
  };
  return labels[status] || status;
};
