let masterPassword = localStorage.getItem("masterPassword");

if (!masterPassword) {
  console.log("Master password not set. Please set a master password.");
  // You might prompt the user here if no master password is set
  masterPassword = prompt("Please set a master password:");
  if (masterPassword) {
    localStorage.setItem("masterPassword", masterPassword);
    alert("Master password set successfully.");
  } else {
    alert("Master password is required to save and decrypt passwords.");
  }
}

// Function to set the master password
function setMasterPassword(password) {
  masterPassword = password;
  localStorage.setItem("masterPassword", password);
  alert("Master password set.");
}

// Hash the master password to ensure a 256-bit key
async function hashMasterPassword(masterPassword) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);
  const hashBuffer = await window.crypto.subtle.digest(
    "SHA-256",
    passwordBuffer
  );
  return hashBuffer;
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Convert Base64 string back to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const arrayBuffer = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arrayBuffer[i] = binaryString.charCodeAt(i);
  }
  return arrayBuffer.buffer;
}

// Encrypt a password using AES encryption
async function encryptPassword(password, masterPassword) {
  const encoder = new TextEncoder();
  const keyBuffer = await hashMasterPassword(masterPassword);

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
  const encryptedPassword = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(password)
  );

  return { iv, encryptedPassword };
}

// Decrypt a password using AES encryption
async function decryptPassword(encryptedPassword, iv, masterPassword) {
  const decoder = new TextDecoder();
  const keyBuffer = await hashMasterPassword(masterPassword);

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedPassword
  );

  return decoder.decode(decryptedBuffer);
}

// Save the encrypted password
async function savePassword() {
  const website = document.getElementById("website").value;
  const password = document.getElementById("password").value;

  console.log(
    "Attempting to save password:",
    website,
    password,
    masterPassword
  ); // Debugging log

  if (!website || !password || !masterPassword) {
    alert("Please provide a website and password, and set a master password.");
    return;
  }

  try {
    const { iv, encryptedPassword } = await encryptPassword(
      password,
      masterPassword
    );
    const encryptedPasswordBase64 = arrayBufferToBase64(encryptedPassword);
    const ivBase64 = arrayBufferToBase64(iv);

    const storedPasswords = JSON.parse(localStorage.getItem("passwords")) || {};
    storedPasswords[website] = {
      iv: ivBase64,
      encryptedPassword: encryptedPasswordBase64,
    };
    localStorage.setItem("passwords", JSON.stringify(storedPasswords));

    console.log("Password saved:", storedPasswords); // Debugging log
    displayPasswords();
  } catch (error) {
    console.error("Error saving password:", error);
  }
}

// Display the list of stored passwords (website names and decrypted passwords)
async function displayPasswords() {
  const passwordList = document.getElementById("passwordList");
  passwordList.innerHTML = "";

  const storedPasswords = JSON.parse(localStorage.getItem("passwords")) || {};
  for (const website in storedPasswords) {
    const { iv, encryptedPassword } = storedPasswords[website];

    // Convert Base64 to ArrayBuffer
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedPasswordBuffer = base64ToArrayBuffer(encryptedPassword);

    // Decrypt the password
    const decryptedPassword = await decryptPassword(
      encryptedPasswordBuffer,
      ivBuffer,
      masterPassword
    );

    const listItem = document.createElement("li");
    listItem.textContent = `${website}: ${decryptedPassword}`;
    passwordList.appendChild(listItem);
  }
}

// Event listener for the save button
document.getElementById("saveBtn").addEventListener("click", savePassword);

// Call displayPasswords() initially to show any stored passwords
displayPasswords();
