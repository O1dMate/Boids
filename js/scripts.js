const totalPoints = 500;
const MOVE_SPEED = 2;
const BOID_LENGTH = 8;
const BOID_WIDTH = 5;

const FOV = 3*Math.PI/4;
const NEARBY_RADIUS = 300;

const SEPARATION_STRENGTH = 0.075;
const ALIGNMENT_STRENGTH = 0.04;
const COHESION_STRENGTH = 0.06;
const MOUSE_STRENGTH = 0.15;
const WALL_STRENGTH = 2;

let SCREEN_WIDTH = 0;
let SCREEN_HEIGHT = 0;

let POINT_LIST = [];

const drawRect = (x, y, w, h) => rect(x, SCREEN_HEIGHT-y, w, h);
const drawLine = (x1, y1, x2, y2) => line(x1, SCREEN_HEIGHT-y1, x2, SCREEN_HEIGHT-y2);
const drawCircle = (x, y, d) => circle(x, SCREEN_HEIGHT-y, d);
const drawArc = (x, y, w, h, startAngle, stopAngle) => arc(x, SCREEN_HEIGHT - y, w, h, 2*Math.PI-stopAngle, 2*Math.PI-startAngle);


let pointSeparation = {};
let pointAlignment = {};
let pointCohesion = {};
let avoidMouse = {};
let avoidWall = {};


// Initial Setup
function setup() {
	SCREEN_WIDTH = window.innerWidth - 20;
	SCREEN_HEIGHT = window.innerHeight - 20

	createCanvas(window.innerWidth-20, window.innerHeight-20);

	for (let i = 0; i < totalPoints; i++) {
		POINT_LIST.push(new Point(SCREEN_WIDTH, SCREEN_HEIGHT, MOVE_SPEED, i));
	}

	frameRate(60);
}

function draw() {
	// Draw background & set Rectangle draw mode
	background(255);
	rectMode(CENTER);

	// Draw scene rectangle
	fill(30,30,30);
	stroke(255,255,255);
	drawRect(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT)

	fill(255,255,255,80);

	// Clear all the objects storing the changes to be made
	pointSeparation = {};
	pointAlignment = {};
	pointCohesion = {};
	avoidMouse = {};
	avoidWall = {};

	POINT_LIST.forEach((currentPoint, currentIndex) => {
		// Draw this boid to the screen
		drawBoid(currentPoint, false);

		// Get a list of all the nearby boids
		let boidsInFov = getListOfPointsInFov(currentPoint);

		// Calculate how this boid should move based on the boids around it.
		pointSeparation[currentIndex] = getSeparation(currentPoint, boidsInFov);
		pointAlignment[currentIndex] = getAlignment(boidsInFov);
		pointCohesion[currentIndex] = getCohesion(currentPoint, boidsInFov);
		avoidMouse[currentIndex] = awayFromMouse(currentPoint);
		avoidWall[currentIndex] = awayFromWall(currentPoint);
	});

	// Update Direction & Position
	POINT_LIST.forEach((currentPoint, currentIndex) => {
		currentPoint.changeDirection(pointSeparation[currentIndex].x, pointSeparation[currentIndex].y);
		currentPoint.changeDirection(pointAlignment[currentIndex].x, pointAlignment[currentIndex].y);
		currentPoint.changeDirection(pointCohesion[currentIndex].x, pointCohesion[currentIndex].y);
		currentPoint.changeDirection(avoidMouse[currentIndex].x, avoidMouse[currentIndex].y);
		currentPoint.changeDirection(avoidWall[currentIndex].x, avoidWall[currentIndex].y);

		currentPoint.update();
	});
}

const drawBoid = (pointObject, drawFov=false) => {
	let x = pointObject.position.x
	let y = pointObject.position.y
	let frontX = x + pointObject.direction.x*BOID_LENGTH;
	let frontY = y + pointObject.direction.y*BOID_LENGTH;

	let angleHeadedIn = Math.atan2(pointObject.direction.y, pointObject.direction.x);
	let leftPointAngle = angleHeadedIn + FOV/2;
	let rightPointAngle = angleHeadedIn - FOV/2;

	let leftPoint = { x: Math.cos(leftPointAngle), y: Math.sin(leftPointAngle) };
	let rightPoint = { x: Math.cos(rightPointAngle), y: Math.sin(rightPointAngle) };

	// Draw the FOV if applicable
	if (drawFov) {
		stroke(255,255,255);
		fill(0,0,0,0);
		drawArc(x, y, NEARBY_RADIUS*2, NEARBY_RADIUS*2, rightPointAngle, leftPointAngle);
		drawLine(x, y, x+leftPoint.x*NEARBY_RADIUS, y+leftPoint.y*NEARBY_RADIUS);
		drawLine(x, y, x+rightPoint.x*NEARBY_RADIUS, y+rightPoint.y*NEARBY_RADIUS);
	}

	stroke(0,255,0);
	fill(0,255,0);

	// Draw line from left and right points to the Boid's actual position
	drawLine(x, y, x+leftPoint.x*BOID_WIDTH/2, y+leftPoint.y*BOID_WIDTH/2);
	drawLine(x, y, x+rightPoint.x*BOID_WIDTH/2, y+rightPoint.y*BOID_WIDTH/2);

	// Draw line from left and right points to the front point.
	drawLine(frontX, frontY, x+leftPoint.x*BOID_WIDTH/2, y+leftPoint.y*BOID_WIDTH/2);
	drawLine(frontX, frontY, x+rightPoint.x*BOID_WIDTH/2, y+rightPoint.y*BOID_WIDTH/2);
}

const drawPoint = (pointObject) => {
	stroke(255,0,0);
	fill(255,0,0);
	drawCircle(pointObject.position.x, pointObject.position.y, pointObject.radius);
}

const drawLineToNearby = (pointObject) => {
	stroke(30,210,230);

	getListOfPointsInFov(pointObject).forEach(point => {
		drawLine(pointObject.position.x, pointObject.position.y, point.position.x, point.position.y);
	})
}

const getListOfPointsInFov = (pointObject) => {
	return POINT_LIST.filter(point => {
		// Don't include the target point in the list
		if (point.id === pointObject.id) return false;

		// Determine if the point is close enough
		if (distanceBetweenPoints(pointObject, point) < NEARBY_RADIUS) {
			// If the point is close enough, ensure it's in the FOV

			// Find the vector to the target point
			let angleHeadedIn = Math.atan2(pointObject.direction.y, pointObject.direction.x);

			let directionToTargetX = point.position.x - pointObject.position.x;
			let directionToTargetY = point.position.y - pointObject.position.y;
			let angleToTarget = Math.atan2(directionToTargetY, directionToTargetX);
			
			// Find the true difference between the two angles
			let difference = angleHeadedIn - angleToTarget;
			if (difference > Math.PI) difference -= 2*Math.PI;
			else if (difference < -Math.PI) difference += 2*Math.PI;

			// Check if the angle to the target is within our FOV
			if (Math.abs(difference) < FOV/2) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	})
}

const findClosestPointToPoint = (targetPoint, pointList) => {
	let minPointIndex = 0;
	let minDist = 100000000;

	pointList.forEach((currentPoint, currentIndex) => {
		let dist = distanceBetweenPoints(targetPoint, currentPoint);

		if (dist < minDist) {
			minDist = dist;
			minPointIndex = currentIndex;
		}
	})
	
	return pointList[minPointIndex];
}

const awayFromMouse = (pointObject) => {
	let distanceFromMouse = distanceBetweenPoints(pointObject, { position: { x: mouseX, y: SCREEN_HEIGHT-mouseY } });

	if (distanceFromMouse > NEARBY_RADIUS) return { x: 0, y: 0 };

	let directionToMove = {
		x: pointObject.position.x - mouseX,
		y: pointObject.position.y - (SCREEN_HEIGHT-mouseY)
	};

	let length = Math.sqrt(directionToMove.x ** 2 + directionToMove.y ** 2);
	directionToMove.x *= MOUSE_STRENGTH / length;
	directionToMove.y *= MOUSE_STRENGTH / length;

	return directionToMove;
}

const awayFromWall = (pointObject) => {
	let distanceToCheckFrom = 400;

	let distanceToLeftWall = pointObject.position.x;
	let distanceToRightWall = SCREEN_WIDTH - pointObject.position.x;
	let distanceToBottomWall = pointObject.position.y;
	let distanceToTopWall = SCREEN_HEIGHT - pointObject.position.y;

	let directionToMove = { x: 0, y: 0 };

	if (distanceToLeftWall < distanceToCheckFrom) {
		directionToMove.x +=1;
	} else if (distanceToRightWall < distanceToCheckFrom) {
		directionToMove.x -= 1;
	} else if (distanceToBottomWall < distanceToCheckFrom) {
		directionToMove.y += 1;
	} else if (distanceToTopWall < distanceToCheckFrom) {
		directionToMove.y -= 1;
	}

	let length = Math.sqrt(directionToMove.x ** 2 + directionToMove.y ** 2);

	if (length !== 0) {
		directionToMove.x *= (WALL_STRENGTH / Math.min(distanceToLeftWall, distanceToRightWall)) / length;
		directionToMove.y *= (WALL_STRENGTH / Math.min(distanceToBottomWall, distanceToTopWall)) / length;
	}

	return directionToMove;
}

const getSeparation = (pointObject, nearbyPoints) => {
	if (nearbyPoints.length <= 0) return { x: 0, y: 0 };

	// Convert to a unit vector
	let separationDirectionToMoveIn = nearbyPoints.map(point => {
		return {
			x: (pointObject.position.x - point.position.x),
			y: (pointObject.position.y - point.position.y)
		};
	}).reduce((acum, cur) => {
		cur.x += acum.x;
		cur.y += acum.y;
		return cur;
	}, { x: 0, y: 0 })

	let length = Math.sqrt(separationDirectionToMoveIn.x ** 2 + separationDirectionToMoveIn.y ** 2);
	separationDirectionToMoveIn.x *= SEPARATION_STRENGTH / length;
	separationDirectionToMoveIn.y *= SEPARATION_STRENGTH / length;

	return separationDirectionToMoveIn;
}

const getAlignment = (nearbyPoints) => {
	if (nearbyPoints.length <= 0) return { x: 0, y: 0 };

	let alignmentDirectionToMoveIn = nearbyPoints.map(point => {
		return {
			x: point.direction.x,
			y: point.direction.y
		};
	}).reduce((acum, cur) => {
		cur.x += acum.x;
		cur.y += acum.y;
		return cur;
	}, { x: 0, y: 0 })

	// Convert to a unit vector
	let length = Math.sqrt(alignmentDirectionToMoveIn.x ** 2 + alignmentDirectionToMoveIn.y ** 2);
	alignmentDirectionToMoveIn.x *= ALIGNMENT_STRENGTH / length;
	alignmentDirectionToMoveIn.y *= ALIGNMENT_STRENGTH / length;

	return alignmentDirectionToMoveIn;
}

const getCohesion = (pointObject, nearbyPoints) => {
	if (nearbyPoints.length <= 0) return { x: 0, y: 0 };

	let cohesionPointSum = nearbyPoints.map(point => {
		return {
			x: point.position.x,
			y: point.position.y
		};
	}).reduce((acum, cur) => {
		cur.x += acum.x;
		cur.y += acum.y;
		return cur;
	}, { x: 0, y: 0 })
	
	// Find the middle point of the nearby points
	cohesionPointSum.x /= nearbyPoints.length;
	cohesionPointSum.y /= nearbyPoints.length;

	// Determine the direction for the target point to the middle point
	let cohesionDirectionToMoveIn = {
		x: cohesionPointSum.x - pointObject.position.x,
		y: cohesionPointSum.y - pointObject.position.y
	};

	// Convert to a unit vector
	let length = Math.sqrt(cohesionDirectionToMoveIn.x ** 2 + cohesionDirectionToMoveIn.y ** 2);
	cohesionDirectionToMoveIn.x *= COHESION_STRENGTH / length;
	cohesionDirectionToMoveIn.y *= COHESION_STRENGTH / length;

	return cohesionDirectionToMoveIn;
}

const distanceBetweenPoints = (pointA, pointB) => {
	return Math.sqrt(Math.pow(pointA.position.x - pointB.position.x, 2) + Math.pow(pointA.position.y - pointB.position.y, 2));
}

class Point {
	constructor(backgroundSizeX, backgroundSizeY, moveSpeed, id) {
		// Store basic properties
		this.id = id;
		this.moveSpeed = moveSpeed;
		this.backgroundSize = { x: backgroundSizeX, y: backgroundSizeY };

		// Generate random starting position
		this.position = {
			x: Math.floor(Math.random() * (this.backgroundSize.x - 1)),
			y: Math.floor(Math.random() * (this.backgroundSize.y - 1))
		};

		// Generate random starting direction
		let xDir = -1 + Math.random() * 2;
		let yDir = -1 + Math.random() * 2;

		// Convert to a unit vector
		let length = Math.sqrt(xDir ** 2 + yDir ** 2);
		this.direction = { x: xDir / length, y: yDir / length };
	}

	update() {
		// Update the position of the object
		this.position.x += this.direction.x * this.moveSpeed;
		this.position.y += this.direction.y * this.moveSpeed;

		// Handle going off the left & right sides
		if (this.position.x < 0) this.position.x += this.backgroundSize.x;
		else if (this.position.x > this.backgroundSize.x - 1) this.position.x -= this.backgroundSize.x;

		// Handle going off the top and bottom sides
		if (this.position.y < 0) this.position.y += this.backgroundSize.y;
		else if (this.position.y > this.backgroundSize.y - 1) this.position.y -= this.backgroundSize.y;
	}

	changeDirection(newDirectionX, newDirectionY) {
		this.direction.x += newDirectionX;
		this.direction.y += newDirectionY;

		// Convert new direction to a unit vector
		let length = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2);
		this.direction.x /= length;
		this.direction.y /= length;
	}
}