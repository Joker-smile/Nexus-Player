package com.nexus.player;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "SSDP")
public class SSDPPlugin extends Plugin {
    private static final String TAG = "SSDPPlugin";
    private static final String SSDP_ADDRESS = "239.255.255.250";
    private static final int SSDP_PORT = 1900;
    private static final int TIMEOUT_MS = 5000;
    
    private final String M_SEARCH = 
        "M-SEARCH * HTTP/1.1\r\n" +
        "HOST: " + SSDP_ADDRESS + ":" + SSDP_PORT + "\r\n" +
        "MAN: \"ssdp:discover\"\r\n" +
        "MX: 3\r\n" +
        "ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n" +
        "\r\n";

    @PluginMethod
    public void search(PluginCall call) {
        new Thread(() -> {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            WifiManager.MulticastLock multicastLock = wifi.createMulticastLock("ssdp_multicast");
            multicastLock.acquire();
            
            DatagramSocket socket = null;
            try {
                socket = new DatagramSocket();
                socket.setSoTimeout(TIMEOUT_MS);
                
                InetAddress group = InetAddress.getByName(SSDP_ADDRESS);
                byte[] sendData = M_SEARCH.getBytes();
                DatagramPacket sendPacket = new DatagramPacket(sendData, sendData.length, group, SSDP_PORT);
                
                // Send discovery packet multiple times for reliability
                socket.send(sendPacket);
                Thread.sleep(500);
                socket.send(sendPacket);
                
                byte[] receiveData = new byte[2048];
                Set<String> locations = new HashSet<>();
                
                long startTime = System.currentTimeMillis();
                while (System.currentTimeMillis() - startTime < TIMEOUT_MS) {
                    try {
                        DatagramPacket receivePacket = new DatagramPacket(receiveData, receiveData.length);
                        socket.receive(receivePacket);
                        
                        String response = new String(receivePacket.getData(), 0, receivePacket.getLength());
                        String location = parseLocation(response);
                        
                        if (location != null && !locations.contains(location)) {
                            locations.add(location);
                            
                            JSObject ret = new JSObject();
                            ret.put("location", location);
                            notifyListeners("deviceFound", ret);
                        }
                    } catch (SocketTimeoutException e) {
                        break;
                    }
                }
                
                JSObject result = new JSObject();
                result.put("finished", true);
                call.resolve(result);
                
            } catch (Exception e) {
                Log.e(TAG, "Error in SSDP search", e);
                call.reject("Error in SSDP search", e);
            } finally {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
                if (multicastLock.isHeld()) {
                    multicastLock.release();
                }
            }
        }).start();
    }
    
    private String parseLocation(String response) {
        String[] lines = response.split("\r\n");
        for (String line : lines) {
            if (line.toLowerCase().startsWith("location:")) {
                return line.substring(9).trim();
            }
        }
        return null;
    }
}
