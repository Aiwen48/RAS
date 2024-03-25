// Simulated data values for testing
let simulatedDataValues = [
    { dataType: 0xAA, dataValue: -1.23 },
    { dataType: 0xBB, dataValue: 2.45 },
    { dataType: 0xCC, dataValue: 0.67 },
    { dataType: 0xAA, dataValue: -1.23 },
    { dataType: 0xBB, dataValue: 2.45 },
    { dataType: 0xCC, dataValue: 0.67 }
];

// Function to simulate receiving data and process it
function simulateDataProcessing() {
    let receivedData = "";

    simulatedDataValues.forEach(function(dataPoint) {
        let dataType = dataPoint.dataType;
        let dataValue = dataPoint.dataValue;

        // Process data based on data type
        switch (dataType) {
            case 0xAA:
                receivedData += "X: " + convertAndFormatData(dataValue) + "<br>";
                break;
            case 0xBB:
                receivedData += "Y: " + convertAndFormatData(dataValue) + "<br>";
                break;
            case 0xCC:
                receivedData += "Z: " + convertAndFormatData(dataValue) + "<br>";
                break;
            default:
                // Unknown data type
                receivedData += "Unknown Data Type: " + dataType.toString(16) + "<br>";
        }
    });

    // Display received data
    let dataContainer = document.getElementById("data");
    dataContainer.innerHTML = receivedData;

    // Process IMU data
    IMUprocess(receivedData);
}

// Function to convert and format data (example conversion)
function convertAndFormatData(value) {
    // Example conversion: assume the received data is an offset value
    let offsetValue = value * 100; // Multiply by 100 as an example

    // Format the value (you can change this formatting)
    return offsetValue.toFixed(2); // Two decimal places
}

// Function to process IMU data and calculate step frequency
function IMUprocess(data) {
    // Parse the received data to extract X, Y, Z values
    let lines = data.split("<br>");
    let xValues = [];
    let yValues = [];
    let zValues = [];

    lines.forEach(function(line) {
        if (line.startsWith("X")) {
            xValues.push(parseFloat(line.split(": ")[1]));
        } else if (line.startsWith("Y")) {
            yValues.push(parseFloat(line.split(": ")[1]));
        } else if (line.startsWith("Z")) {
            zValues.push(parseFloat(line.split(": ")[1]));
        }
    });

    

    // Perform calculation for step frequency
    let steps = 0;
    let lastTimestamp = 0;
    for (let i = 0; i < xValues.length; i++) {
        console.log(i);
        let accelerationMagnitude = Math.sqrt(xValues[i] * xValues[i] + yValues[i] * yValues[i] + zValues[i] * zValues[i]);
        let threshold = 1; // Adjust threshold as needed for simulation
        let currentTimestamp = Date.now();
        if (lastTimestamp !== 0) {
            let deltaTime = (currentTimestamp - lastTimestamp) / 1000; // Convert to seconds
            if (accelerationMagnitude > threshold) {
                steps++;
            }
        }
        lastTimestamp = currentTimestamp;
        console.log("MagAcc " +accelerationMagnitude)
    }

    // Calculate step frequency (steps per minute)
    let stepFrequency = steps / ((lastTimestamp - lines.length * 5) / 1000 / 60);
    console.log("步频 (步/分钟): " + stepFrequency.toFixed(2));
    console.log("Steps: " +steps)
    
}

// Call the function to simulate data processing
console.log(simulateDataProcessing());

