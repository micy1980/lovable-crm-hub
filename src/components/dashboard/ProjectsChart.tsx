import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProjectsChartProps {
  data: Record<string, number>;
}

export const ProjectsChart = ({ data }: ProjectsChartProps) => {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: getStatusLabel(status),
    count
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Projektek státusz szerint</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="hsl(var(--primary))" name="Projektek" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    planning: 'Tervezés',
    in_progress: 'Folyamatban',
    on_hold: 'Felfüggesztve',
    completed: 'Befejezett',
    cancelled: 'Törölve',
  };
  return labels[status] || status;
};
