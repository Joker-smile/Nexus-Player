import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

export interface DlnaDevice {
  name: string;
  location: string;
  controlUrl: string;
}

export interface SSDPPlugin {
  search(): Promise<{ finished: boolean }>;
  addListener(eventName: 'deviceFound', listenerFunc: (info: { location: string }) => void): any;
}

const SSDP = registerPlugin<SSDPPlugin>('SSDP');

export class DlnaService {
  private devices = new Map<string, DlnaDevice>();
  private listeners: ((devices: DlnaDevice[]) => void)[] = [];

  constructor() {
    if (Capacitor.isNativePlatform()) {
      SSDP.addListener('deviceFound', async (info) => {
        try {
          const device = await this.parseDeviceDesc(info.location);
          if (device && !this.devices.has(device.location)) {
            this.devices.set(device.location, device);
            this.notifyListeners();
          }
        } catch (err) {
          console.error('Failed to parse DLNA device', err);
        }
      });
    }
  }

  public async searchDevices() {
    this.devices.clear();
    this.notifyListeners();
    if (Capacitor.isNativePlatform()) {
      await SSDP.search();
    }
  }

  public getDevices(): DlnaDevice[] {
    return Array.from(this.devices.values());
  }

  public subscribe(listener: (devices: DlnaDevice[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const devs = this.getDevices();
    this.listeners.forEach(l => l(devs));
  }

  private async parseDeviceDesc(location: string): Promise<DlnaDevice | null> {
    const res = await CapacitorHttp.get({ url: location });
    const text = res.data;
    if (typeof text !== 'string') return null;

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const friendlyNameNode = xml.querySelector('device > friendlyName');
    const name = friendlyNameNode ? friendlyNameNode.textContent || 'Unknown TV' : 'Unknown TV';

    let controlUrl = '';
    const services = xml.querySelectorAll('service');
    for (let i = 0; i < services.length; i++) {
      const type = services[i].querySelector('serviceType')?.textContent;
      if (type && type.includes('AVTransport')) {
        const curl = services[i].querySelector('controlURL')?.textContent;
        if (curl) {
          controlUrl = curl;
          break;
        }
      }
    }

    if (!controlUrl) return null;

    // Resolve relative URL
    if (controlUrl.startsWith('/')) {
      const urlObj = new URL(location);
      controlUrl = `${urlObj.protocol}//${urlObj.host}${controlUrl}`;
    } else if (!controlUrl.startsWith('http')) {
      const urlObj = new URL(location);
      let path = urlObj.pathname;
      path = path.substring(0, path.lastIndexOf('/') + 1);
      controlUrl = `${urlObj.protocol}//${urlObj.host}${path}${controlUrl}`;
    }

    return {
      name,
      location,
      controlUrl
    };
  }

  public async playVideo(device: DlnaDevice, videoUrl: string, title: string = 'Video') {
    // 1. SetAVTransportURI
    const setUriSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <CurrentURI>${this.escapeXml(videoUrl)}</CurrentURI>
      <CurrentURIMetaData></CurrentURIMetaData>
    </u:SetAVTransportURI>
  </s:Body>
</s:Envelope>`;

    await CapacitorHttp.post({
      url: device.controlUrl,
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"'
      },
      data: setUriSoap
    });

    // 2. Play
    const playSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    </u:Play>
  </s:Body>
</s:Envelope>`;

    await CapacitorHttp.post({
      url: device.controlUrl,
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Play"'
      },
      data: playSoap
    });
  }

  public async stop(device: DlnaDevice) {
    const stopSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Stop xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
    </u:Stop>
  </s:Body>
</s:Envelope>`;

    await CapacitorHttp.post({
      url: device.controlUrl,
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Stop"'
      },
      data: stopSoap
    });
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

export const dlnaService = new DlnaService();
