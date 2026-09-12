/*
I'm sure there are more elegant ways to create the sprites than what I'm providing with this starter script. This
does a bit more than is required for demonstration purposes.

Scott
*/

using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Threading;

using Stellar_Sprites;

public class Ship : MonoBehaviour
{
	// Public fields
	public bool Threaded = false;
	public GameObject Exhaust;

	public bool CustomSeed = false;
	public int Seed = 0;

	public bool CustomShipType = false;
	public SS_ShipType ShipType = SS_ShipType.Fighter;

	public bool CustomScale = true;
	public float Scale = 1f;

	public bool CustomColors = false;
	public Color[] Colors = new Color[] { Color.white, Color.white };

	public bool CustomColorDetail = false;
	public float ColorDetail = 0.125f;

    public bool CustomBodyDetail = true;
    public float BodyDetail = 0.01f;  // 0.01 to 0.1

    public bool CustomWingDetail = true;
    public float WingDetail = 0.1f;   // 0.01 to 0.1

	public Color OutlineColor = Color.white;

    // Rendering Options
    public FilterMode filterMode = FilterMode.Bilinear;

	// Other Options
	public bool CreateRigidBody = true;
	public bool CreateCollider = true;
	public bool CreateSpawnPoints = true;

	// Private fields
	private SS_Ship spriteObject;
	private bool threadCompleted = false;
	private Rigidbody2D rb2D;

	private string SortingLayerName = "Ship";
	private int SortingOrder = 2;

    // Use this for initialization
	void Start () {

        // Generate the sprite
        Generate();
        
	}
	
	// Update is called once per frame
	void Update () {

        // When the ThreadGenerator function is complete, we can continue and create the SpriteRenderer object
        if (threadCompleted)
        {
            // Create the procedural sprite when it's thread has generated the texture data
            Texture2D texture = new Texture2D(spriteObject.Width, spriteObject.Height);
            texture.filterMode = filterMode;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels(spriteObject.GetColors());
            texture.Apply();

            var spriteRenderer = GetComponent<SpriteRenderer>();
            if (spriteRenderer == null)
            {
                gameObject.AddComponent<SpriteRenderer>();
                spriteRenderer = GetComponent<SpriteRenderer>();
                spriteRenderer.sortingLayerName = SortingLayerName;
                spriteRenderer.sortingOrder = SortingOrder;
                
            }
			spriteRenderer.sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f));
			transform.localScale = new Vector3(Scale, Scale, 1);

            if (CreateRigidBody)
            {
                rb2D = GetComponent<Rigidbody2D>();
                if (rb2D == null)
                {
                    gameObject.AddComponent<Rigidbody2D>();
                    rb2D = GetComponent<Rigidbody2D>();
                }
                rb2D.gravityScale = 0;
                rb2D.mass = 100;
                rb2D.drag = 1f;
                rb2D.angularDrag = 1f;
            }

            if (CreateCollider)
            {
                var polygonCollider2D = GetComponent<PolygonCollider2D>();
                if (polygonCollider2D != null)
                {
                    Destroy(polygonCollider2D);
                }
                gameObject.AddComponent<PolygonCollider2D>();
                polygonCollider2D = GetComponent<PolygonCollider2D>();
            }

			if (CreateSpawnPoints)
			{
				// Engine children - have particle system attached
				if (Exhaust != null)
				{
					Color startColor = new Color((float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f));
					for (int i = 0; i < spriteObject.enginePoints.Count; i++)
					{
						Vector2 position = spriteObject.enginePoints[i];

						GameObject engine = (GameObject)Instantiate(Exhaust);
						engine.name = "Engine " + i.ToString();
						engine.transform.parent = transform;
						engine.transform.localPosition = position / spriteRenderer.sprite.pixelsPerUnit;
						engine.GetComponent<Renderer>().sortingOrder = 1;
						engine.GetComponent<ParticleSystem>().enableEmission = false;
						engine.GetComponent<ParticleSystem>().transform.forward = -transform.right;
						engine.GetComponent<ParticleSystem>().startColor = startColor;
					}
				}
				else
				{
					// No particle system attached - just spawn empty object
					for (int i = 0; i < spriteObject.enginePoints.Count; i++)
					{
						Vector2 position = spriteObject.enginePoints[i];
						
						GameObject engine = new GameObject("Engine " + i.ToString());
						engine.transform.parent = transform;
						engine.transform.localPosition = position / spriteRenderer.sprite.pixelsPerUnit;
						engine.GetComponent<Renderer>().sortingOrder = 1;
					}
				}

				// Weapon children
				for (int i = 0; i < spriteObject.weaponPoints.Count; i++)
				{
					Vector2 position = spriteObject.weaponPoints[i];

					GameObject weapon = new GameObject("Weapon " + i.ToString());
					weapon.transform.parent = transform;
					weapon.transform.localPosition = position / spriteRenderer.sprite.pixelsPerUnit;
				}
			}

            threadCompleted = false;
        }
	}

    /// <summary>
    /// Generates the sprite texture in its own thread and when the thread is complete, Unity will create the game object's sprite
    /// </summary>
    void GenerateSprite()
    {
        // This is the good stuff here - Create the texture data
        //spriteObject = new SS_Ship(Seed, ShipType, Colors, ColorDetail, Steps, SmoothIterations, Color.white);
		spriteObject = new SS_Ship (Seed, ShipType, BodyDetail, WingDetail, Colors, ColorDetail);

        // Once this is complete, we can assign this as the SpriteRenderer sprite.
        threadCompleted = true;
    }

    /// <summary>
    /// Added this code to a method so that I could call it from the Editor script
    /// </summary>
    public void Generate()
    {
		// Delete any children
		var children = new List<GameObject>();
		foreach (Transform child in transform) children.Add(child.gameObject);
		children.ForEach(child => Destroy(child));

        // User wants a random seed
        if (!CustomSeed)
        {
			Seed = Random.Range (0, 100000000);
        }

        // User wants a random ship type
        if (!CustomShipType)
        {
            System.Array values = System.Enum.GetValues(typeof(SS_ShipType));
            ShipType = (SS_ShipType)values.GetValue(Random.Range(0, values.Length));
        }

        // User wants a random size
        if (!CustomScale)
        {
			Scale = Random.Range (1f, 2f);
        }

        // User wants random colors
        if (!CustomColors)
        {
			Colors[0] = Color.grey;
			Colors[1] = new Color((float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f));
            //Colors = new Color[3];
			//Colors = SS_Utilities.GenerateColorWheelColors(Seed, 3);
			//Colors[0] = new Color(128f / 255f, 128f / 255f, 128f / 255f);
			//Colors[0] = new Color(96f / 255f, 96f / 255f, 96f / 255f);
			//Colors[1] = new Color(96f / 255f, 96f / 255f, 96f / 255f);//new Color(128f / 255f, 128f / 255f, 128f / 255f);
            //Colors[1] = new Color((float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f));
        }

		// User wants custom color detail (noise frequency)
		if (!CustomColorDetail)
		{
			ColorDetail = Random.Range (0.01f, 0.1f);
		}

        // User wants custom body detail (noise frequency)
        if (!CustomBodyDetail)
        {
            BodyDetail = Random.Range(0.01f, 0.1f);
        }

        // User wants custom body detail (noise frequency)
        if (!CustomWingDetail)
        {
            WingDetail = Random.Range(0.01f, 0.1f);
        }

        // Start thread to generate texture
        if (Threaded)
        {
            Thread t = new Thread(new ThreadStart(GenerateSprite));
            t.Start();
        }
        else
        {
            GenerateSprite();
        }
    }

    public void SaveToFile()
    {
        spriteObject.GetSpriteTexture.SaveToFile("ship", Seed);
    }
}
