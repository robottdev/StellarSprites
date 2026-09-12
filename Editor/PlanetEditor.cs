using UnityEngine;
using UnityEditor;
using System.Collections;

using Stellar_Sprites;

[CustomEditor(typeof(Planet))]
public class PlanetEditor : Editor
{
    Planet myTarget;
    int labelWidth = 80;

    bool foldout = true;
	bool foldoutOther = false;

    public void OnEnable()
    {
        myTarget = (Planet)target;
    }

    public override void OnInspectorGUI()
    {
        string[] availableSizes = new string[myTarget.AvailableSizes.Length];
        for (int i = 0; i < myTarget.AvailableSizes.Length; i++) availableSizes[i] = myTarget.AvailableSizes[i].ToString();

        foldout = EditorGUILayout.Foldout(foldout, "Properites");
        if (foldout)
        {
            myTarget.CustomSeed = EditorGUILayout.BeginToggleGroup("Custom Seed", myTarget.CustomSeed);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Seed:", GUILayout.Width(labelWidth));
            myTarget.Seed = EditorGUILayout.IntField(myTarget.Seed);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomSize = EditorGUILayout.BeginToggleGroup("Custom Size", myTarget.CustomSize);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Size:", GUILayout.Width(labelWidth));
            myTarget.Size = EditorGUILayout.IntPopup(myTarget.Size, availableSizes, myTarget.AvailableSizes);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomScale = EditorGUILayout.BeginToggleGroup("Custom Scale", myTarget.CustomScale);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Scale:", GUILayout.Width(labelWidth));
            myTarget.Scale = EditorGUILayout.Slider(myTarget.Scale, 0.5f, 2f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomColors = EditorGUILayout.BeginToggleGroup("Custom Colors", myTarget.CustomColors);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Colors:", GUILayout.Width(labelWidth));
            for (int i = 0; i < myTarget.Colors.Length; i++)
            {
                myTarget.Colors[i] = EditorGUILayout.ColorField(myTarget.Colors[i]);
            }
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomPlanetType = EditorGUILayout.BeginToggleGroup("Custom Type", myTarget.CustomPlanetType);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Type:", GUILayout.Width(labelWidth));
            myTarget.PlanetType = (SS_PlanetType)EditorGUILayout.EnumPopup(myTarget.PlanetType);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomOceans = EditorGUILayout.BeginToggleGroup("Custom Oceans", myTarget.CustomOceans);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Oceans:", GUILayout.Width(labelWidth));
            myTarget.Oceans = EditorGUILayout.Toggle(myTarget.Oceans);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomClouds = EditorGUILayout.BeginToggleGroup("Custom Clouds", myTarget.CustomClouds);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Clouds:", GUILayout.Width(labelWidth));
            myTarget.Clouds = EditorGUILayout.Toggle(myTarget.Clouds);
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Density:", GUILayout.Width(labelWidth));
            myTarget.CloudDensity = EditorGUILayout.Slider(myTarget.CloudDensity, 0f, 1f);
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Transparency:", GUILayout.Width(labelWidth));
            myTarget.CloudTransparency = EditorGUILayout.Slider(myTarget.CloudTransparency, 0f, 1f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomAtmosphere = EditorGUILayout.BeginToggleGroup("Custom Atmosphere", myTarget.CustomAtmosphere);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Atmosphere:", GUILayout.Width(labelWidth));
            myTarget.Atmosphere = EditorGUILayout.Toggle(myTarget.Atmosphere);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

			myTarget.CustomCity = EditorGUILayout.BeginToggleGroup("Custom City", myTarget.CustomCity);
			GUILayout.BeginHorizontal();
			EditorGUILayout.LabelField("City:", GUILayout.Width(labelWidth));
			myTarget.City = EditorGUILayout.Toggle(myTarget.City);
			GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("City Density:", GUILayout.Width(labelWidth));
            myTarget.CityDensity = EditorGUILayout.Slider(myTarget.CityDensity, 0.9f, 1f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomLighting = EditorGUILayout.BeginToggleGroup("Custom Lighting", myTarget.CustomLighting);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Light Angle:", GUILayout.Width(labelWidth));
            myTarget.LightAngle = EditorGUILayout.Slider(myTarget.LightAngle, 0f, 359f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();
        }

		foldoutOther = EditorGUILayout.Foldout(foldoutOther, "Other");
		if (foldoutOther)
		{
			GUILayout.BeginHorizontal();
			EditorGUILayout.LabelField("Threaded:", GUILayout.Width(labelWidth));
			myTarget.Threaded = EditorGUILayout.Toggle(myTarget.Threaded);
			GUILayout.EndHorizontal();
		}

        EditorGUILayout.BeginHorizontal();
        if (GUILayout.Button("Generate"))
        {
            myTarget.Generate();
        }
        if (GUILayout.Button("Save To File"))
        {
            myTarget.SaveToFile();
        }
        EditorGUILayout.EndHorizontal();

        if (GUI.changed)
            EditorUtility.SetDirty(target);
    }
}