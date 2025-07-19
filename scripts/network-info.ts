import os from 'os';

interface NetworkInfo {
  interface: string;
  address: string;
  family: string;
  internal: boolean;
}

function getNetworkInfo(): NetworkInfo[] {
  const interfaces = os.networkInterfaces();
  const networkInfo: NetworkInfo[] = [];

  for (const [name, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    
    for (const net of nets) {
      // Kun IPv4 adresser
      if (net.family === 'IPv4') {
        networkInfo.push({
          interface: name,
          address: net.address,
          family: net.family,
          internal: net.internal
        });
      }
    }
  }

  return networkInfo;
}

function displayNetworkInfo() {
  const networks = getNetworkInfo();
  
  console.log('\n🌐 SagsHub Netværksinformation');
  console.log('=====================================');
  
  // Lokale adresser
  const local = networks.filter(n => n.internal);
  console.log('\n📍 Lokale adresser (kun denne computer):');
  local.forEach(net => {
    console.log(`   http://${net.address}:3000`);
  });
  
  // Netværksadresser
  const external = networks.filter(n => !n.internal);
  console.log('\n🌍 Netværksadresser (andre enheder kan tilgå):');
  if (external.length === 0) {
    console.log('   Ingen eksterne netværksadresser fundet');
    console.log('   Sørg for at computeren er forbundet til et netværk');
  } else {
    external.forEach(net => {
      console.log(`   http://${net.address}:3000 (${net.interface})`);
    });
  }
  
  console.log('\n📱 For at tilgå fra andre enheder:');
  console.log('   1. Sørg for at firewall tillader port 3000');
  console.log('   2. Brug en af netværksadresserne ovenfor');
  console.log('   3. Andre enheder skal være på samme WiFi/netværk');
  console.log('=====================================\n');
}

// Kør funktionen direkte
displayNetworkInfo();

export { getNetworkInfo, displayNetworkInfo }; 