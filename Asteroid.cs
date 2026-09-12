/*
I'm sure there are more elegant ways to create the sprites than what I'm providing with this starter script. This
does a bit more than is required for demonstration purposes.

Scott
*/

using UnityEngine;
using System.Collections;
using System.Threading;

using Stellar_Sprites;

public class Asteroid : MonoBehaviour
{
    // List of planet sizes (these look best in my opinion)
    public int[] AvailableSizes = new int[] { 64 };
    public Color[] AvailableMineralColors = new Color[] { Color.yellow, Color.red, Color.cyan };

	// Public fields
	public bool Threaded = false;

    public bool CustomSeed = false;
    public int Seed = 0;

    public bool CustomSize = false;
    public int Size = 64;

	public bool CustomScale = true;
    public float Scale = 1f;

    public bool CustomColors = false;
    public Color[] Colors = new Color[] { new Color(0.40f, 0.40f, 0.40f), new Color(0.63f, 0.63f, 0.63f), new Color(0.75f, 0.75f, 0.75f) };

    public bool CustomMinerals = false;
    public bool Minerals = true;

    public bool CustomMineralColor = false;
    public Color MineralColor = Color.yellow;

    public bool CustomLighting = false;
    public float LightAngle = 180f;

    // Private fields
    private SS_Asteroid spriteObject;
    private bool threadCompleted = false;

    // Physics
    private Rigidbody2D rb2D;
    public bool CreateRigidBody = true;
    public bool CreateCollider = true;


    // Use this for initialization
    void Start()
    {
        Generate();
    }

    // Update is called once per frame
    void Update()
    {
        // When the ThreadGenerator function is complete, we can continue and create the SpriteRenderer object
        if (threadCompleted)
        {
            // Create the procedural sprite when it's thread has generated the texture data
            Texture2D texture = new Texture2D(spriteObject.Size, spriteObject.Size);
            texture.filterMode = FilterMode.Trilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels(spriteObject.GetColors());
            texture.Apply();

            var spriteRenderer = GetComponent<SpriteRenderer>();
            if (spriteRenderer == null)
            {
                gameObject.AddComponent<SpriteRenderer>();
                spriteRenderer = GetComponent<SpriteRenderer>();
                spriteRenderer.sortingLayerName = "Asteroid";
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
                //var polygonCollider2D = GetComponent<PolygonCollider2D>();
                //if (polygonCollider2D != null)
                //{
                //    Destroy(polygonCollider2D);
                //}
                //gameObject.AddComponent<PolygonCollider2D>();
                //polygonCollider2D = GetComponent<PolygonCollider2D>();
                var circleCollider2D = GetComponent<CircleCollider2D>();
                if (circleCollider2D != null)
                {
                    Destroy(circleCollider2D);
                }
                gameObject.AddComponent<CircleCollider2D>();
                circleCollider2D = GetComponent<CircleCollider2D>();
            }

            threadCompleted = false;
        }

    }

    /// <summary>
    /// Generates the sprite texture in its own thread
    /// </summary>
	void GenerateSprite()
    {
        // This is the good stuff here - Create the texture data
        spriteObject = new SS_Asteroid(Seed, Size, Colors, Minerals, MineralColor, LightAngle);

        // Once this is complete, we can assign this as the SpriteRenderer sprite.
        threadCompleted = true;
    }

    /// <summary>
    /// Added this code to a method so that I could call it from the Editor script
    /// </summary>
    public void Generate()
    {
        // User wants a random seed
        if (!CustomSeed)
        {
			Seed = Random.Range (0, 100000000);
        }

        // User wants a random size
        if (!CustomSize)
        {
            Size = AvailableSizes[Random.Range(0, AvailableSizes.Length)];
        }

        // User wants a random scale
        if (!CustomScale)
        {
            Scale = Random.Range(1f, 2f);
        }

        // User wants random colors
        if (!CustomColors)
        {
            Colors = SS_Utilities.GenerateColorWheelColors(Seed, 3);
        }

        // User wants custom minerals
        if (!CustomMinerals)
        {
            Minerals = Random.Range(0, 2) > 0;
        }

        // User wants random mineral color
        if (!CustomMineralColor)
        {
            MineralColor = AvailableMineralColors[Random.Range(0, AvailableMineralColors.Length)];
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
		spriteObject.GetSpriteTexture.SaveToFile("asteroid", Seed);
    }
}
