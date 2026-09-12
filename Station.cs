/*
I'm sure there are more elegant ways to create the sprites than what I'm providing with this starter script. This
does a bit more than is required for demonstration purposes.

Scott
*/

using UnityEngine;
using System.Collections;
using System.Threading;

using Stellar_Sprites;

public class Station : MonoBehaviour
{
    #region Common Fields

    private string SortingLayerName = "Ship";
    private int SortingOrder = 1;

    private Rigidbody2D rb2D;

    #endregion

    #region Generation Fields

	// Public fields
	public bool Threaded = false;

    public bool CustomSeed = false;
    public int Seed = 0;

    public bool CustomScale = true;
    public float Scale = 1f;

    public bool CustomColors = false;
    public Color[] Colors = new Color[] { Color.white, Color.white };

    public bool CustomColorDetail = true;
    public float ColorDetail = 0.01f;

    public bool CustomPods = false;
    public int NumberOfPods = 6;

    public Color OutlineColor = Color.white;

    // Rendering Options
    public FilterMode filterMode = FilterMode.Bilinear;

    // Physics
    public bool CreateRigidBody = true;
    public bool CreateCollider = true;

    public bool CreateSpawnPoints = true;

    // Private fields
    private SS_Station spriteObject;
    private bool threadCompleted = false;

    #endregion

    // Use this for initialization
    void Start()
    {

        // Generate the sprite
        Generate();

    }

    // Update is called once per frame
    void Update()
    {

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
        spriteObject = new SS_Station(Seed, Colors, ColorDetail, NumberOfPods);

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
        if (!CustomScale)
        {
            Scale = 1f;// Random.Range(1f, 2f);
        }

        // User wants random colors
        if (!CustomColors)
        {
            Colors[0] = Color.grey;
            Colors[1] = new Color((float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f));
        }

        // User wants custom color detail (noise frequency)
        if (!CustomColorDetail)
        {
            ColorDetail = Random.Range(0.01f, 0.1f);
        }

        if (!CustomPods)
        {
            SS_Random random = new SS_Random(Seed);
            NumberOfPods = random.RangeEven(2, 8);
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
        spriteObject.GetSpriteTexture.SaveToFile("station", Seed);
    }
}
