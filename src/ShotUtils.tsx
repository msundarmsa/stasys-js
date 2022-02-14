const getDirection = (shot: Shot): string => {
	if (shot.angle <= Math.PI / 8 || shot.angle >= 15 * Math.PI / 8)
	{
		return "top";
	}
	else if (shot.angle <= 3 * Math.PI / 8 && shot.angle >= Math.PI / 8)
	{
        return "top_right";
	}
	else if (shot.angle <= 5 * Math.PI / 8 && shot.angle >= 3 * Math.PI / 8)
	{
        return "right";
	}
	else if (shot.angle <= 7 * Math.PI / 8 && shot.angle >= 5 * Math.PI / 8)
	{
        return "bottom_right";
	}
	else if (shot.angle <= 9 * Math.PI / 8 && shot.angle >= 7 * Math.PI / 8)
	{
        return "bottom";
	}
	else if (shot.angle <= 11 * Math.PI / 8 && shot.angle >= 9 * Math.PI / 8)
	{
        return "bottom_left";
	}
	else if (shot.angle <= 13 * Math.PI / 8 && shot.angle >= 11 * Math.PI / 8)
	{
        return "left";
	}
	else
	{
        return "top_left";
	}
};

export const toDP = (num: number, dp: number) => {
    const roundNum = Math.pow(10, dp);
    const numDP = (Math.round(num * roundNum) / roundNum).toFixed(dp);
    return numDP;
}

export interface Shot {
    id: number;
    score: number;
    x: number;
    y: number; 
    angle: number;
    angleStr: string;
    stab: number;
    desc: number;
    aim: number;
}
