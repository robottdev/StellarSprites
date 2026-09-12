using UnityEngine;
using UnityEditor;
using System.Collections;

using Stellar_Sprites;

[CustomEditor(typeof(Sun))]
public class SunEditor : Editor
{
    Sun myTarget;
    int labelWidth = 80;
    bool foldout = true;
	bool foldoutOther = false;

    public void OnEnable()
    {
        myTarget = (Sun)target;
    }

    public override void OnInspectorGUI()
    {
        string[] availableSizes = new string[myTarget.AvailableSizes.Length];
        for (int i = 0; i < myTarget.AvailableSizes.Length; i++) availableSizes[i] = myTarget.AvailableSizes[i].ToString();

        string[] availableColors = new string[myTarget.AvailableColors.Length];
        for (int i = 0; i < myTarget.AvailableColors.Length; i++) availableColors[i] = myTarget.AvailableColors[i].ToString();

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
            myTarget.Scale = EditorGUILayout.Slider(myTarget.Scale, 1f, 2f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomColor = EditorGUILayout.BeginToggleGroup("Custom Color", myTarget.CustomColor);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Color:", GUILayout.Width(labelWidth));
            myTarget.MainColor = EditorGUILayout.ColorField(myTarget.MainColor);
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