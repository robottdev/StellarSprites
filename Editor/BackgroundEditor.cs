using UnityEngine;
using UnityEditor;
using System.Collections;

using Stellar_Sprites;

[CustomEditor(typeof(Background))]
public class BackgroundEditor : Editor
{
    Background myTarget;
    int labelWidth = 80;
    bool foldout = true;
	bool foldoutOther = false;

    public void OnEnable()
    {
        myTarget = (Background)target;
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

            //myTarget.CustomStarCount = EditorGUILayout.BeginToggleGroup("Custom Star Count", myTarget.CustomStarCount);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Frequency:", GUILayout.Width(labelWidth));
            myTarget.Frequency = EditorGUILayout.Slider(myTarget.Frequency, 0.001f, 0.1f);
            GUILayout.EndHorizontal();
            //EditorGUILayout.EndToggleGroup();

            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Lacunarity:", GUILayout.Width(labelWidth));
            myTarget.Lacunarity = EditorGUILayout.Slider(myTarget.Lacunarity, 1f, 5f);
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Persistence:", GUILayout.Width(labelWidth));
            myTarget.Persistence = EditorGUILayout.Slider(myTarget.Persistence, 0.1f, 2f);
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Octaves:", GUILayout.Width(labelWidth));
            myTarget.Octaves = EditorGUILayout.IntSlider(myTarget.Octaves, 1, 16);
            GUILayout.EndHorizontal();

            myTarget.CustomStarCount = EditorGUILayout.BeginToggleGroup("Custom Star Count", myTarget.CustomStarCount);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Star Count:", GUILayout.Width(labelWidth));
            myTarget.StarCount = EditorGUILayout.IntSlider(myTarget.StarCount, myTarget.StarCountMin, myTarget.StarCountMax);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomTint = EditorGUILayout.BeginToggleGroup("Custom Color", myTarget.CustomTint);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Color:", GUILayout.Width(labelWidth));
            myTarget.Tint = EditorGUILayout.ColorField(myTarget.Tint);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomBrightness = EditorGUILayout.BeginToggleGroup("Custom Brightness", myTarget.CustomBrightness);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Brightness:", GUILayout.Width(labelWidth));
            myTarget.Brightness = EditorGUILayout.Slider(myTarget.Brightness, myTarget.BrightnessMin, myTarget.BrightnessMax);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();
        }

		foldoutOther = EditorGUILayout.Foldout(foldoutOther, "Other");
		if (foldoutOther) 
		{
			GUILayout.BeginHorizontal ();
			EditorGUILayout.LabelField ("Threaded:", GUILayout.Width (labelWidth));
			myTarget.Threaded = EditorGUILayout.Toggle (myTarget.Threaded);
			GUILayout.EndHorizontal ();
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