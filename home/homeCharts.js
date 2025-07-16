import React from 'react';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import tw from 'tailwind-react-native-classnames';

const screenWidth = Dimensions.get('window').width;

const HomeCharts = () => {
  const labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  const values = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        color: (opacity = 1) => `rgba(124, 192, 216, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Visits per Day'],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 192, 216, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#7cc0d8',
    },
  };

  return (
    <ScrollView horizontal>
      <View style={tw`p-2 m-2`}>
        <Text style={tw`text-xl font-bold mb-2`}>Visit History - Bar Chart</Text>

        {/* Bar Chart with Value Labels */}
        <View>
          <BarChart
            data={data}
            width={screenWidth * 3}
            height={250}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={{ marginBottom: 32 }}
            showValuesOnTopOfBars
            withInnerLines={false}
            fromZero
          />
        </View>

        <Text style={tw`text-xl font-bold mb-2`}>Visit Trend - Line Chart</Text>

        {/* Line Chart with Value Labels */}
        <View>
          <LineChart
            data={data}
            width={screenWidth * 3}
            height={250}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            bezier
            fromZero
            withInnerLines={false}
            withShadow={false}
          />
          {/* Overlaying the values manually */}
          <View
            style={{
              position: 'absolute',
              top: 60,
              left: 50,
              width: screenWidth * 3,
              flexDirection: 'row',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              pointerEvents: 'none',
            }}
          >
            {values.map((value, index) => (
              <Text
                key={index}
                style={{
                  fontSize: 10,
                  color: 'black',
                  position: 'absolute',
                  top: 200 - value * 20, // approximate vertical offset
                  left: index * 35, // spacing based on chart width
                }}
              >
                {value}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeCharts;
