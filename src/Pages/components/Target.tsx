const circles = [
    { radius:311/680, fill:"", border:"#D7EC58" },
    { radius:279/680, fill:"", border:"#D7EC58" },
    { radius:247/680, fill:"", border:"#D7EC58" },
    { radius:43/136, fill:"", border:"#D7EC58" },
    { radius:183/680, fill:"", border:"#D7EC58" },
    { radius:151/680, fill:"", border:"#D7EC58" },
    { radius:7/40, fill:"#D7EC58", border:"" },
    { radius:87/680, fill:"#D7EC59", border:"#464646" },
    { radius:11/136, fill:"#D7EC60", border:"#464646" },
    { radius:23/680, fill:"#D7EC61", border:"#464646" },
    { radius:1/68, fill:"#D7EC62", border:"#464646" }
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

export const Target = () => (
    <svg style={{ height: '100%', width: '100%', aspectRatio: '1/1' }}>
        {circles.map((circle, _) => {     
           return (<circle cx="50%" cy="50%" r={`${circle.radius * 100}%`} fill={circle.fill} stroke={circle.border} />) 
        })}
        {circleNumbers.map((circleNum, _) => {     
           return (<text x={`${circleNum.x * 100}%`} y={`${circleNum.y * 100}%`} fill={circleNum.color} dominantBaseline="middle" textAnchor="middle">{circleNum.text}</text>) 
        })}
    </svg>
);

export const ZoomedTarget = () => (
    <svg style={{ height: '100%', width: '100%', aspectRatio: '1/1'}}>
        {circles.map((circle, _) => {     
           return (<circle cx="50%" cy="50%" r={`${circle.radius * 100}%`} fill={circle.fill} stroke={circle.border} />) 
        })}
    </svg>
)