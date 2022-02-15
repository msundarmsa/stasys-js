import { PELLET_SIZE, SEVEN_RING_SIZE, Shot, TARGET_SIZE } from "../../ShotUtils";

const circles = [
    { radius:311/680, fill:"#121212", border:"#D7EC58" },
    { radius:279/680, fill:"#121212", border:"#D7EC58" },
    { radius:247/680, fill:"#121212", border:"#D7EC58" },
    { radius:43/136, fill:"#121212", border:"#D7EC58" },
    { radius:183/680, fill:"#121212", border:"#D7EC58" },
    { radius:151/680, fill:"#121212", border:"#D7EC58" },
    { radius:7/40, fill:"#D7EC58", border:"" },
    { radius:87/680, fill:"#D7EC59", border:"#121212" },
    { radius:11/136, fill:"#D7EC60", border:"#121212" },
    { radius:23/680, fill:"#D7EC61", border:"#121212" },
    { radius:1/68, fill:"#D7EC62", border:"#121212" }
]

const circleNumbers = [
    { text: "1", x:   1/2  , y: 127/136, color: "#D7EC58" },
    { text: "1", x:   1/2  , y:   9/136, color: "#D7EC58" },
    { text: "1", x: 127/136, y:   1/2  , color: "#D7EC58" },
    { text: "1", x:   9/136, y:   1/2  , color: "#D7EC58" },
    { text: "2", x:   1/2  , y: 603/680, color: "#D7EC58" },
    { text: "2", x:   1/2  , y:  77/680, color: "#D7EC58" },
    { text: "2", x: 603/680, y:   1/2  , color: "#D7EC58" },
    { text: "2", x:  77/680, y:   1/2  , color: "#D7EC58" },
    { text: "3", x:   1/2  , y: 571/680, color: "#D7EC58" },
    { text: "3", x:   1/2  , y: 109/680, color: "#D7EC58" },
    { text: "3", x: 571/680, y:   1/2  , color: "#D7EC58" },
    { text: "3", x: 109/680, y:   1/2  , color: "#D7EC58" },
    { text: "4", x:   1/2  , y: 539/680, color: "#D7EC58" },
    { text: "4", x:   1/2  , y: 141/680, color: "#D7EC58" },
    { text: "4", x: 539/680, y:   1/2  , color: "#D7EC58" },
    { text: "4", x: 141/680, y:   1/2  , color: "#D7EC58" },
    { text: "5", x:   1/2  , y: 507/680, color: "#D7EC58" },
    { text: "5", x:   1/2  , y: 173/680, color: "#D7EC58" },
    { text: "5", x: 507/680, y:   1/2  , color: "#D7EC58" },
    { text: "5", x: 173/680, y:   1/2  , color: "#D7EC58" },
    { text: "6", x:   1/2  , y:  95/136, color: "#D7EC58" },
    { text: "6", x:   1/2  , y:  41/136, color: "#D7EC58" },
    { text: "6", x:  95/136, y:   1/2  , color: "#D7EC58" },
    { text: "6", x:  41/136, y:   1/2  , color: "#D7EC58" },
    { text: "7", x:   1/2  , y: 443/680, color: "#464646" },
    { text: "7", x:   1/2  , y: 237/680, color: "#464646" },
    { text: "7", x: 443/680, y:   1/2  , color: "#464646" },
    { text: "7", x: 237/680, y:   1/2  , color: "#464646" },
    { text: "8", x:   1/2  , y: 411/680, color: "#464646" },
    { text: "8", x:   1/2  , y: 269/680, color: "#464646" },
    { text: "8", x: 411/680, y:   1/2  , color: "#464646" },
    { text: "8", x: 269/680, y:   1/2  , color: "#464646" }
]

export const Target = ( {shots, shot}: {shots: Shot[], shot: Shot | undefined} ) => {
    const translateShotX = (shot: Shot): number => {
        return (shot.x + TARGET_SIZE / 2) / TARGET_SIZE * 100;
    };
    const translateShotY = (shot: Shot): number => {
        return (TARGET_SIZE / 2 - shot.y) / TARGET_SIZE * 100;
    };

    return (
        <svg style={{ height: '100%', width: '100%', aspectRatio: '1/1' }}>
            {circles.map((circle, _) => {     
                return (<circle cx="50%" cy="50%" r={`${circle.radius * 100}%`} fill={circle.fill} stroke={circle.border} />) 
            })}
            {circleNumbers.map((circleNum, _) => {     
                return (<text x={`${circleNum.x * 100}%`} y={`${circleNum.y * 100}%`} fill={circleNum.color} dominantBaseline="middle" textAnchor="middle">{circleNum.text}</text>) 
            })}
            {shots.map((shot, _) => {
                return (<circle cx={`${translateShotX(shot)}%`} cy={`${translateShotY(shot)}%`} fill="#000000" r={`${PELLET_SIZE / TARGET_SIZE * 100}%`} stroke="#ffffff" strokeWidth={3}/>)
            })}
            { shot ? <circle cx={`${translateShotX(shot)}%`} cy={`${translateShotY(shot)}%`} fill="#ff1493" r={`${PELLET_SIZE / TARGET_SIZE * 100}%`} stroke="#ffffff" strokeWidth={3}/>
                   : null }
        </svg>
    );
};

export const ZoomedTarget = ( {shots}: {shots: Shot[]}) => {
    const startIndex = 6;
    const shotSize = PELLET_SIZE / 29.75 * 50;

    const transformShot = (shot: Shot): { inside: boolean, x: number, y: number, angle: number } => {
        const inside = shot.r <= 29.75;
        const r = inside ? shot.r : 25.75;
        const rX = r * Math.cos(shot.angle);
        const rY = r * Math.sin(shot.angle);

        const cX = (rX + SEVEN_RING_SIZE) / (2 * SEVEN_RING_SIZE) * 100;
        const cY = (SEVEN_RING_SIZE - rY) / (2 * SEVEN_RING_SIZE) * 100;
        return {inside: inside, x: cX, y: cY, angle: shot.angle * 180 / Math.PI};
    }

    return (
        <svg style={{ height: '100%', width: '100%', aspectRatio: '1/1'}}>
            {circles.map((circle, i) => {
                return ( i >= startIndex ? <circle cx="50%" cy="50%" r={`${circle.radius * 50 / circles[startIndex].radius}%`} fill={circle.fill} stroke={circle.border} /> : null ) 
            })}
            {shots.map((shot, _) => transformShot(shot)).map((plot, _) => {
                return ( plot.inside ? <circle cx={`${plot.x}%`} cy={`${plot.y}%`} fill="#000000" r={`${shotSize}%`} stroke="#ffffff" strokeWidth={3} /> 
                                     : <svg id="triangle" viewBox="0 0 100 100" height={`${2 * shotSize}%`} width={`${2 * shotSize}%`} x={`${plot.x - shotSize}%`} y={`${plot.y - shotSize}%`}> <polygon x="-50%" y="-50%" points="0 100, 50 0, 100 100" height="10" width="10" /> </svg>
                )
            })}
        </svg>
    );
}