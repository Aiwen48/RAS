// link to firebase Realtime database
import {initializeApp} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import {getDatabase,ref,push,onValue,remove} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js"

const appSettings={
    // 换成 firebase realtime 的API
    databaseURL:"https://imu33-1dbad-default-rtdb.firebaseio.com/"
}

const app=initializeApp(appSettings)
const database=getDatabase(app)
const MagListInDB=ref(database,"MagList")
const steps_AListInDB=ref(database,"step_BList")
const steps_BListInDB=ref(database,"step_AList")

//const inputFieldE1=document.getElementById("input-field")
//const addButtonE1=document.getElementById("add-button")
//const shoppingListE1=document .getElementById("shopping-list")

let lastTimestamp = 0;
let steps = 0;
let bluetoothCharacteristic;

// Function to handle receiving data from the BLE device
function receiveData(event) {
    let value = event.target.value;
    let dataView = new DataView(value.buffer);
    let receivedData = "";

    // !! Loop through data in chunks of 5 bytes (assuming each data point is 5 bytes)
    for (let i = 0; i < dataView.byteLength; i += 5) {
        let dataType = dataView.getUint8(i); // Get the data type
        let dataValue = dataView.getFloat32(i + 1, true); // Get the data value (little-endian)

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
                receivedData += "未知数据类型: " + dataType.toString(16) + "<br>";
        }
    }

    // Display received data
    let dataContainer = document.getElementById("data");
    dataContainer.innerHTML = receivedData;

    // Process IMU data
    IMUprocess(receivedData);

    // Process IMU data and send data if step count increases
    let currentSteps = IMUprocess(receivedData);
    //根据方法一 的步数发出信号to BLE。
    if (currentSteps > steps) {
        sendBluetoothData(1); // Send '1' when step count increases
        steps = currentSteps; // Update steps
    }
}


// Function to convert and format data (example conversion)
function convertAndFormatData(value) {
    // Example conversion: assume the received data is an offset value
    let offsetValue = value * 100; // Multiply by 100 as an example

    // Format the value (you can change this formatting)
    return offsetValue.toFixed(2); // Two decimal places
}

// Function to send data to the Bluetooth device
async function sendBluetoothData(data) {
    try {
        if (!bluetoothCharacteristic) {
            console.error("Bluetooth characteristic not available.");
            return;
        }

        // Convert data to ArrayBuffer
        let buffer = new ArrayBuffer(1); // Assuming 1 byte of data
        let dataView = new DataView(buffer);
        dataView.setUint8(0, data);

        await bluetoothCharacteristic.writeValue(buffer);
        console.log("Sent data to Bluetooth: " + data);
    } catch (error) {
        console.error('Error sending data to Bluetooth:', error);
    }
}


// Function to start scanning for BLE devices
async function startScan() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] // Add your device's service UUID,covert to lower case,have to follow the format 
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e'); // Add your device's service UUID, have to follow the format 
        const characteristic = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e'); // Add your device's characteristic UUID, have to follow the format 

        // Subscribe to notifications to receive data
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', receiveData);
    } catch (error) {
        console.error('Error:', error);
    }
}


// Function to process IMU data and calculate step frequency
function IMUprocess(data) {
    // Parse the received data to extract X, Y, Z values
    let lines = data.split("<br>");
    // ？？需不需要将xValues，yValues 以及zValues 设为全局变量
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
    let steps_A = 0;
    let lastTimestamp_A = 0;

    //Method一：
    //？？？如果如果要每个magnitude 记录下来的话把i 放在外面???
    for (let i = 0; i < xValues.length; i++) {
        let accelerationMagnitude = Math.sqrt(xValues[i] * xValues[i] + yValues[i] * yValues[i] + zValues[i] * zValues[i]);
        // 阈值算法
        let threshold = 10; // Adjust threshold as needed
        let currentTimestamp = Date.now();
        if (lastTimestamp_A !== 0) {
            let deltaTime = (currentTimestamp - lastTimestamp_A) / 1000; // Convert to seconds
            if (accelerationMagnitude > threshold) {
                steps_A++;
            }
        }
        lastTimestamp_A = currentTimestamp;
        console.log(accelerationMagnitude)
        push(MagListInDB,accelerationMagnitude);
        return steps_A;
    }

    // Calculate step frequency (steps per minute)
    let stepFrequency_A = steps_A / ((lastTimestamp_A - lines.length * 5) / 1000 / 60);
    console.log("方法一 步频 (步/分钟): " + stepFrequency_A.toFixed(2));
    //把方法一获得的步频 放入标签为step_BList的数据库里
    push(steps_AListInDB,stepFrequency_A);


    //Method 2:

    let steps_B = 0;
    let lastTimestamp_B = 0;

    for (let i = 0; i < xValues.length-1; i++) {
        let accelerationMagnitude_first = Math.sqrt(xValues[i] * xValues[i] + yValues[i] * yValues[i] + zValues[i] * zValues[i]);
        let accelerationMagnitude_Second = Math.sqrt(xValues[i+1] * xValues[i+1] + yValues[i+1] * yValues[i+1] + zValues[i+1] * zValues[i+1]);
        let diff=accelerationMagnitude_Second-accelerationMagnitude_first;
        let diff_betweenTwoPoint = 10; // Adjust threshold as needed
        let currentTimestamp = Date.now();
        if (lastTimestamp_B !== 0) {
            let deltaTime = (currentTimestamp - lastTimestamp_B) / 1000; // Convert to seconds
            if (diff_betweenTwoPoint > threshold) {
                steps_B++;
            }
        }
        lastTimestamp_B = currentTimestamp;
    }

    // Calculate step frequency (steps per minute)
    let stepFrequency_B = steps_B / ((lastTimestamp_B - lines.length * 5) / 1000 / 60);
    console.log("方法二 步频 (步/分钟): " + stepFrequency_B.toFixed(2));
    push(ShoppingListInDB,method2Result);
    //把方法一获得的步频 放入标签为step_BList的数据库里
    push(steps_BListInDB,stepFrequency_B);

}


// Event listener for the scan button
document.getElementById("scanButton").addEventListener("click", startScan);


