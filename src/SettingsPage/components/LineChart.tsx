import { axisLeft, axisBottom, scaleLinear, select, line as d3Line } from 'd3';
import { useEffect, useState, useRef } from 'react';

const LineChart = ({ data, refLevel }: IProps) => {
  const [firstRender, setFirstRender] = useState(true);
  const svgElem = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgElem.current) {
      return;
    }

    // init x and y range
    let minX = 0;
    let maxX = 5;
    if (data.length > 0) {
      const newMinX = data[0].x;
      const newMaxX = data[data.length - 1].x;
      // only update range after first 5s of data is collected
      if (newMaxX > maxX) {
        minX = newMinX;
        maxX = newMaxX;
      }
    }
    const minY = 0;
    const maxY = 1;

    // get element height and width
    const height = svgElem.current.clientHeight;
    const width = svgElem.current.clientWidth;

    // set margin around element to prevent clipping of axes
    const MARGINS = {
      top: 30,
      right: 20,
      bottom: 30,
      left: 75,
    };

    if (firstRender) {
      // add placeholder for axes
      select('.line-chart').append('g').attr('class', 'line-chart-yaxis');
      select('.line-chart').append('g').attr('class', 'line-chart-xaxis');

      // add placeholder for lines
      select('.line-chart').append('path').attr('class', 'line-chart-line');
      select('.line-chart').append('path').attr('class', 'line-chart-ref-line');

      setFirstRender(false);
    }

    // map x range and y range to width and height respectively
    const xScale = scaleLinear()
      .domain([minX, maxX])
      .range([MARGINS.left, width - MARGINS.right]);
    const yScale = scaleLinear()
      .domain([minY, maxY])
      .range([height - MARGINS.top, MARGINS.bottom]);

    // create axes
    const yAxis = axisLeft(yScale).ticks(5);
    const xAxis = axisBottom(xScale).ticks(5);

    // y-axis label
    select('#y-axis-label').remove();
    select('.line-chart')
      .append('g')
      .attr('id', 'y-axis-label')
      .attr('transform', `translate(${MARGINS.left - 30}, ${height / 2})`)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .style('fill', 'white')
      .text('Volume');

    // draw axes
    select('.line-chart-xaxis')
      .attr('transform', `translate(0, ${height - MARGINS.bottom})`)
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .call(xAxis);
    select('.line-chart-yaxis')
      .attr('transform', `translate(${MARGINS.left}, 0)`)
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .call(yAxis);

    // draw line
    const line = d3Line()
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .x((point) => xScale(point.x))
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .y((point) => yScale(point.y));

    select('.line-chart-line')
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .attr('d', line(data))
      .attr('fill', 'none')
      .attr('stroke', '#0071dd')
      .attr('stroke-width', 1.5);

    // draw ref line
    const refLine = d3Line()
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .x((point) => xScale(point.x))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .y((_) => yScale(refLevel));

    select('.line-chart-ref-line')
      // @ts-expect-error: expect errors here due to inconsistencies in @types/d3
      .attr('d', refLine(data))
      .attr('fill', 'none')
      .attr('stroke', '#755f89')
      .attr('stroke-width', 1.5);
  }, [firstRender, data, refLevel, svgElem]);

  return (
    <svg
      ref={svgElem}
      className="line-chart"
      width="100%"
      style={{ aspectRatio: '1280/720' }}
    />
  );
};

interface IProps {
  data: { x: number; y: number }[];
  refLevel: number;
}

export default LineChart;
