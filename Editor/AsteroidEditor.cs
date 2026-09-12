using UnityEngine;
using UnityEditor;
using System.Collections;

[CustomEditor(typeof(Asteroid))]
public class AsteroidEditor : Editor
{
    Asteroid myTarget;
    int labelWidth = 80;
    bool foldout = true;
    bool foldoutOther = false;

    public void OnEnable()
    {
        myTarget = (Asteroid)target;
    }

    public override void OnInspectorGUI()
    {
        string[] availableSizes = new string[myTarget.AvailableSizes.Length];
        for (int i = 0; i < myTarget.AvailableSizes.Length; i++) availableSizes[i] = myTarget.AvailableSizes[i].ToString();

        string[] availableMineralColors = new string[myTarget.AvailableMineralColors.Length];
        for (int i = 0; i < myTarget.AvailableMineralColors.Length; i++) availableMineralColors[i] = myTarget.AvailableMineralColors[i].ToString();

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

            myTarget.CustomMinerals = EditorGUILayout.BeginToggleGroup("Custom Minerals", myTarget.CustomMinerals);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Minerals:", GUILayout.Width(labelWidth));
            myTarget.Minerals = EditorGUILayout.Toggle(myTarget.Minerals);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomMineralColor = EditorGUILayout.BeginToggleGroup("Custom Mineral Color", myTarget.CustomMineralColor);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Mineral Color:", GUILayout.Width(labelWidth));
            myTarget.MineralColor = EditorGUILayout.ColorField(myTarget.MineralColor);
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

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Rigid Body", GUILayout.Width(labelWidth));
            myTarget.CreateRigidBody = EditorGUILayout.Toggle(myTarget.CreateRigidBody, GUILayout.Width(20));
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Collider", GUILayout.Width(labelWidth));
            myTarget.CreateCollider = EditorGUILayout.Toggle(myTarget.CreateCollider, GUILayout.Width(20));
            EditorGUILayout.EndHorizontal();
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