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
}


// Function to convert and format data (example conversion)
function convertAndFormatData(value) {
    // Example conversion: assume the received data is an offset value
    let offsetValue = value * 100; // Multiply by 100 as an example

    // Format the value (you can change this formatting)
    return offsetValue.toFixed(2); // Two decimal places
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



// Event listener for the scan button
document.getElementById("scanButton").addEventListener("click", startScan);


