using UnityEngine;
using UnityEditor;
using System.Collections;

using Stellar_Sprites;

[CustomEditor(typeof(Ship))]
public class ShipEditor : Editor
{
    Ship myTarget;
    int labelWidth = 80;

    bool foldout = true;
	bool foldoutOther = false;

    public void OnEnable()
    {
        myTarget = (Ship)target;
    }

    public override void OnInspectorGUI()
    {
        foldout = EditorGUILayout.Foldout(foldout, "Properites");
        if (foldout)
        {
            myTarget.CustomSeed = EditorGUILayout.BeginToggleGroup("Custom Seed", myTarget.CustomSeed);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Seed:", GUILayout.Width(labelWidth));
            myTarget.Seed = EditorGUILayout.IntField(myTarget.Seed);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomShipType = EditorGUILayout.BeginToggleGroup("Custom Type", myTarget.CustomShipType);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Type:", GUILayout.Width(labelWidth));
            myTarget.ShipType = (SS_ShipType)EditorGUILayout.EnumPopup(myTarget.ShipType);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

			myTarget.CustomScale = EditorGUILayout.BeginToggleGroup("Custom Scale", myTarget.CustomScale);
			GUILayout.BeginHorizontal();
			EditorGUILayout.LabelField("Scale:", GUILayout.Width(labelWidth));
			myTarget.Scale = EditorGUILayout.Slider(myTarget.Scale, 1f, 2f);
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

			myTarget.CustomColorDetail = EditorGUILayout.BeginToggleGroup("Custom Color Detail", myTarget.CustomColorDetail);
			GUILayout.BeginHorizontal();
			EditorGUILayout.LabelField("Color Detail:", GUILayout.Width(labelWidth));
			myTarget.ColorDetail = EditorGUILayout.Slider(myTarget.ColorDetail, 0.05f, 0.25f);
			GUILayout.EndHorizontal();
			EditorGUILayout.EndToggleGroup();

            myTarget.CustomBodyDetail = EditorGUILayout.BeginToggleGroup("Custom Body Detail", myTarget.CustomBodyDetail);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Body Detail:", GUILayout.Width(labelWidth));
            myTarget.BodyDetail = EditorGUILayout.Slider(myTarget.BodyDetail, 0.01f, 0.1f);
            GUILayout.EndHorizontal();
            EditorGUILayout.EndToggleGroup();

            myTarget.CustomWingDetail = EditorGUILayout.BeginToggleGroup("Custom Wing Detail", myTarget.CustomWingDetail);
            GUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Wing Detail:", GUILayout.Width(labelWidth));
            myTarget.WingDetail = EditorGUILayout.Slider(myTarget.WingDetail, 0.01f, 0.1f);
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

			GUILayout.BeginHorizontal();
			EditorGUILayout.LabelField("Exhaust Prefab:", GUILayout.Width(labelWidth));
			myTarget.Exhaust = (GameObject)EditorGUILayout.ObjectField (myTarget.Exhaust, typeof(GameObject), false);
			GUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Rigid Body", GUILayout.Width(labelWidth));
            myTarget.CreateRigidBody = EditorGUILayout.Toggle(myTarget.CreateRigidBody, GUILayout.Width(20));
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Collider", GUILayout.Width(labelWidth));
            myTarget.CreateCollider = EditorGUILayout.Toggle(myTarget.CreateCollider, GUILayout.Width(20));
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Spawn Points", GUILayout.Width(labelWidth));
            myTarget.CreateSpawnPoints = EditorGUILayout.Toggle(myTarget.CreateSpawnPoints, GUILayout.Width(20));
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField("Filter Mode", GUILayout.Width(labelWidth));
            myTarget.filterMode = (FilterMode)EditorGUILayout.EnumPopup(myTarget.filterMode);
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