import React, { useState } from "react";
import { View, Text, ImageBackground, Image, TouchableOpacity, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// If your PNGs are in project-root/assets:
import IDFront from "../../assets/ID-FRONT.png";
import IDBack from "../../assets/ID-BACK.png";

const DigitalIDCard = ({ profileData }) => {
  const [loading, setLoading] = useState(false);

  if (!profileData) return null;

  const generatePDF = async () => {
    try {
      setLoading(true);
      // Simple HTML for PDF export
      const htmlContent = `
        <html>
          <body style="font-family: Arial; padding: 20px;">
            <h2 style="text-align:center;">Digital PWD ID</h2>
            <p><b>Name:</b> ${profileData.LastName || ""}, ${profileData.FirstName || ""} ${profileData.MiddleName || ""}</p>
            <p><b>Address:</b> ${profileData.Address || "N/A"}</p>
            <p><b>Disability:</b> ${profileData.TypeofDisability || "N/A"}</p>
            <p><b>Mobile:</b> ${profileData.MobileNo || "N/A"}</p>
            <p><b>ID No:</b> ${profileData.PWD_ID_NO || "N/A"}</p>
            <p><b>Gender:</b> ${profileData.Gender || "N/A"}</p>
            <p><b>Birth Date:</b> ${profileData.BirthDate || "N/A"}</p>
          </body>
        </html>
      `;

      // Create PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log("PDF generated:", uri);

      // Share PDF if available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("PDF Generated", "Your ID PDF has been created but sharing is not available.");
      }
    } catch (error) {
      console.error("PDF Error:", error);
      Alert.alert("Error", "Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Your Digital PWD ID
      </Text>

      {/* FRONT SIDE */}
      <ImageBackground
        source={IDFront}
        style={{ width: "100%", aspectRatio: 85.6 / 53.98, marginBottom: 15 }}
        resizeMode="contain"
      >
        {profileData.profilePictureURL ? (
          <Image
            source={{ uri: profileData.profilePictureURL }}
            style={{
              position: "absolute",
              top: "25%",
              left: "68%",
              width: "22%",
              height: "28.9%",
              borderRadius: 5,
              backgroundColor: "#ddd",
            }}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              top: "24%",
              left: "68%",
              width: "21%",
              height: "30%",
              borderRadius: 5,
              backgroundColor: "#ccc",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 8, color: "#000" }}>No Photo</Text>
          </View>
        )}

        <Text
          style={{
            position: "absolute",
            top: "31%",
            left: "24%",
            fontSize: 12,
            fontWeight: "bold",
            color: "#000",
          }}
        >
          {`${profileData.LastName || ""}, ${profileData.FirstName || ""} ${
            profileData.MiddleName ? profileData.MiddleName[0] + "." : ""
          }`}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "37%",
            left: "24%",
            fontSize: 10,
            width: "50%",
            color: "#000",
          }}
          numberOfLines={2}
        >
          {profileData.Address || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "47.5%",
            left: "35%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.TypeofDisability || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "53%",
            left: "24%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.MobileNo || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            bottom: "23%",
            right: "9%",
            fontSize: 12,
            fontWeight: "bold",
            color: "#000",
          }}
        >
          {profileData.PWD_ID_NO || "N/A"}
        </Text>
      </ImageBackground>

      {/* BACK SIDE */}
      <ImageBackground
        source={IDBack}
        style={{ width: "100%", aspectRatio: 85.6 / 53.98, marginBottom: 20 }}
        resizeMode="contain"
      >
        <Text
          style={{
            position: "absolute",
            top: "2.5%",
            left: "23%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.Gender || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "8%",
            left: "23%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.BirthDate || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "36%",
            left: "21%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.GuardiansName || profileData.ContactPerson || "N/A"}
        </Text>

        <Text
          style={{
            position: "absolute",
            top: "43.6%",
            left: "21%",
            fontSize: 10,
            color: "#000",
          }}
        >
          {profileData.GuardiansName || profileData.ContactPerson || "N/A"}
        </Text>
      </ImageBackground>

      {/* Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity
          onPress={generatePDF}
          style={{
            flex: 1,
            backgroundColor: "#007AFF",
            padding: 12,
            borderRadius: 8,
            marginRight: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {loading ? "Generating..." : "Download PDF"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

export default DigitalIDCard;
